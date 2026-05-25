import type { Request, Response, Router } from "express";
import { healthHandler } from "./health.js";
import { dbPingHandler } from "./db.js";
import { getSessionFromRequest } from "../lib/session.js";
import { supabase } from "../supabase.js";
import {
  forgotPasswordRequestHandler,
  forgotPasswordResetHandler,
  forgotPasswordVerifyHandler,
  getMeHandler,
  loginHandler,
  logoutHandler,
  signUpHandler,
} from "./auth.js";
import { employeeFeedbacksHandler, employeesHandler } from "./employees.js";
import {
  createChatMessageHandler,
  createChatRoomHandler,
  getChatFeedbackHandler,
  getChatRoomDetailHandler,
  listChatRoomsHandler,
  markChatRoomReadHandler,
  pinChatRoomHandler,
  saveChatFeedbackHandler,
  unpinChatRoomHandler,
} from "./chat.js";
import { createUserHandler, usersHandler } from "./users.js";
import {
  getMySettingsHandler,
  heartbeatHandler,
  updateMySettingsHandler,
} from "./settings.js";
import {
  listNotificationsHandler,
  markNotificationsReadHandler,
} from "./notifications.js";
import {
  claimTaskHandler,
  createTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskStatusHandler,
} from "./tasks.js";
import { createTaskReportHandler, listTaskReportsHandler } from "./report.js";
import {
  createPostHandler,
  deletePostReactionHandler,
  getPostReactionsHandler,
  postsDetailHandler,
  postsListHandler,
  postReactionsHandler,
} from "./posts.js";
import {
  createWikiArticleHandler,
  getWikiArticleDetailHandler,
  listWikiArticlesHandler,
} from "./wiki.js";
import {
  createManagedUserHandler,
  deleteManagedUserHandler,
  getModerationPostHandler,
  listManagedUsersHandler,
  updateManagedUserHandler,
} from "./admin.js";

type ModerationStatus = "published" | "rejected";

type RelatedEmployee =
  | {
      name?: string | null;
      avatar_url?: string | null;
    }
  | Array<{
      name?: string | null;
      avatar_url?: string | null;
    }>
  | null
  | undefined;

type ModerationPostRow = {
  id: string;
  topic?: string | null;
  title: string;
  content?: string | null;
  created_at: string;
  status?: "pending" | ModerationStatus | null;
  employees?: RelatedEmployee;
};

const postModerationTopic = "post_moderation";

const postSelectWithStatus = `
  id,
  topic,
  title,
  content,
  created_at,
  created_by,
  status,
  employees:created_by(
    name,
    avatar_url
  )
`;

const postSelectBase = `
  id,
  topic,
  title,
  content,
  created_at,
  created_by,
  employees:created_by(
    name,
    avatar_url
  )
`;

const isMissingColumnError = (error: { code?: string; message?: string }, column: string) => {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST204" || message.includes(column.toLowerCase());
};

const getRelatedEmployee = (employee: RelatedEmployee) =>
  Array.isArray(employee) ? employee[0] : employee;

const summarizePost = (content: string) => {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 80)}...`;
};

const mapModerationPost = (post: ModerationPostRow) => ({
  id: post.id,
  title: post.title,
  summary: summarizePost(post.content ?? ""),
  content: post.content ?? "",
  channel: post.topic || "Bảng tin",
  author: getRelatedEmployee(post.employees)?.name || "Unknown",
  created_at: post.created_at,
  status: post.status ?? "pending",
});

const fetchModeratedPostIds = async () => {
  const { data, error } = await supabase
    .from("notifications")
    .select("title,content")
    .eq("topic", postModerationTopic);

  if (error) return new Set<string>();

  return new Set(
    (data ?? [])
      .map((item) => {
        const title = typeof item.title === "string" ? item.title : "";
        const titleMatch = title.match(/^(published|rejected):([0-9a-f-]{36})$/i);
        if (titleMatch?.[2]) return titleMatch[2];

        if (typeof item.content !== "string") return null;

        try {
          const parsed = JSON.parse(item.content) as { post_id?: unknown };
          return typeof parsed.post_id === "string" ? parsed.post_id : null;
        } catch {
          return null;
        }
      })
      .filter((id): id is string => Boolean(id)),
  );
};

const listPendingPostsCompatHandler = async (_req: Request, res: Response) => {
  try {
    const moderatedPostIds = await fetchModeratedPostIds();
    const statusResult = await supabase
      .from("posts")
      .select(postSelectWithStatus)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    let rows = (statusResult.data ?? []) as ModerationPostRow[];
    let error = statusResult.error;

    if (error && isMissingColumnError(error, "status")) {
      const fallbackResult = await supabase
        .from("posts")
        .select(postSelectBase)
        .order("created_at", { ascending: false })
        .limit(100);

      rows = (fallbackResult.data ?? []) as ModerationPostRow[];
      error = fallbackResult.error;
    }

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({
      ok: true,
      data: rows
        .map(mapModerationPost)
        .filter((post) => !moderatedPostIds.has(post.id)),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

const moderatePostCompatHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ ok: false, error: "Admin token is required" });
    }

    if (session.role !== "admin" || session.source !== "admins") {
      return res.status(403).json({ ok: false, error: "Admin permission is required" });
    }

    const { id } = req.params;
    const status = req.body?.status as ModerationStatus | undefined;

    if (!id) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    if (status !== "published" && status !== "rejected") {
      return res.status(400).json({ ok: false, error: "status must be published or rejected" });
    }

    const result = await supabase
      .from("posts")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .maybeSingle();

    if (!result.error) {
      if (!result.data) {
        return res.status(404).json({ ok: false, error: "Post not found" });
      }

      return res.json({ ok: true, data: result.data });
    }

    if (!isMissingColumnError(result.error, "status")) {
      return res.status(500).json({ ok: false, error: result.error.message });
    }

    const existingPost = await supabase
      .from("posts")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingPost.error) {
      return res.status(500).json({ ok: false, error: existingPost.error.message });
    }

    if (!existingPost.data) {
      return res.status(404).json({ ok: false, error: "Post not found" });
    }

    const decision = await supabase.from("notifications").insert({
      topic: postModerationTopic,
      title: `${status}:${id}`,
      content: JSON.stringify({
        post_id: id,
        status,
        moderated_at: new Date().toISOString(),
      }),
    });

    if (decision.error) {
      return res.status(500).json({ ok: false, error: decision.error.message });
    }

    return res.json({
      ok: true,
      data: {
        id,
        status,
        stored_in: "notifications",
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const registerRoutes = (router: Router) => {
  router.get("/health", healthHandler);
  router.get("/db/ping", dbPingHandler);
  router.get("/employees", employeesHandler);
  router.get("/users", usersHandler);
  router.post("/users", createUserHandler);
  router.get("/employees/:id/feedbacks", employeeFeedbacksHandler);
  router.get("/settings/me", getMySettingsHandler);
  router.patch("/settings/me", updateMySettingsHandler);
  router.post("/presence/heartbeat", heartbeatHandler);
  router.get("/notifications", listNotificationsHandler);
  router.post("/notifications/read-all", markNotificationsReadHandler);
  router.get("/tasks", listTasksHandler);
  router.get("/tasks/:id", getTaskHandler);
  router.post("/tasks", createTaskHandler);
  router.post("/tasks/:id/claim", claimTaskHandler);
  router.patch("/tasks/:id/status", updateTaskStatusHandler);
  router.get("/tasks/:id/reports", listTaskReportsHandler);
  router.post("/tasks/:id/report", createTaskReportHandler);
  
  // Auth routes
  router.post("/auth/login", loginHandler);
  router.post("/auth/signup", signUpHandler);
  router.post("/auth/forgot-password/request", forgotPasswordRequestHandler);
  router.post("/auth/forgot-password/verify", forgotPasswordVerifyHandler);
  router.post("/auth/forgot-password/reset", forgotPasswordResetHandler);
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/me", getMeHandler);
  
  // Posts routes
  router.get("/posts", postsListHandler);
  router.post("/posts", createPostHandler);
  router.get("/posts/:id", postsDetailHandler);
  router.get("/posts/:id/reactions", getPostReactionsHandler);
  router.post("/posts/:id/reactions", postReactionsHandler);
  router.delete("/posts/:id/reactions", deletePostReactionHandler);

  // Wiki routes
  router.get("/wiki", listWikiArticlesHandler);
  router.post("/wiki", createWikiArticleHandler);
  router.get("/wiki/:slug", getWikiArticleDetailHandler);

  // Chat routes
  router.get("/chat/rooms", listChatRoomsHandler);
  router.post("/chat/rooms", createChatRoomHandler);
  router.get("/chat/rooms/:id", getChatRoomDetailHandler);
  router.post("/chat/rooms/:id/messages", createChatMessageHandler);
  router.post("/chat/rooms/:id/read", markChatRoomReadHandler);
  router.post("/chat/rooms/:id/pin", pinChatRoomHandler);
  router.delete("/chat/rooms/:id/pin", unpinChatRoomHandler);
  router.get("/chat/rooms/:id/feedback", getChatFeedbackHandler);
  router.post("/chat/rooms/:id/feedback", saveChatFeedbackHandler);

  // Admin management routes
  router.get("/admin/users", listManagedUsersHandler);
  router.post("/admin/users", createManagedUserHandler);
  router.patch("/admin/users/:source/:id", updateManagedUserHandler);
  router.delete("/admin/users/:source/:id", deleteManagedUserHandler);
  router.get("/admin/posts/pending", listPendingPostsCompatHandler);
  router.get("/admin/posts/:id", getModerationPostHandler);
  router.patch("/admin/posts/:id/moderation", moderatePostCompatHandler);
};
