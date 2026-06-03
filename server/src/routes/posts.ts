import type { Request, Response } from "express";
import crypto from "node:crypto";
import { supabase } from "../supabase";
import type { Post, PostStatus, ReactionType } from "../types";
import { getSessionFromRequest } from "../lib/session";

type JwtLikePayload = {
  sub: string;
  exp: number;
};

const validReactionTypes: ReactionType[] = ["like", "heart", "useful"];

const verifyToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const secret = process.env.AUTH_TOKEN_SECRET ?? "dev-local-secret-change-me";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expected) return null;

  try {
    const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadRaw) as JwtLikePayload;
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const getActorEmployeeId = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.substring(7));
    if (payload?.sub) return payload.sub;
  }

  const employeeId = req.body?.employee_id;
  return typeof employeeId === "string" && employeeId.trim().length > 0
    ? employeeId.trim()
    : null;
};

const mapReactionCounts = (reactions: Array<{ reaction_type: ReactionType }>) => {
  return reactions.reduce(
    (acc, reaction) => {
      if (reaction.reaction_type === "like") acc.like += 1;
      if (reaction.reaction_type === "heart") acc.heart += 1;
      if (reaction.reaction_type === "useful") acc.useful += 1;
      return acc;
    },
    { like: 0, heart: 0, useful: 0 },
  );
};

const firstRelatedEmployee = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

/**
 * Get the visible status filter based on user role.
 * - Admin: sees all (pending, approved, rejected)
 * - Staff/leader: sees only approved
 */
const getVisibleStatuses = (req: Request): PostStatus[] => {
  const session = getSessionFromRequest(req);
  if (session?.role === "admin" || session?.source === "admins") {
    return ["pending", "published", "rejected"];
  }
  return ["published"];
};

/**
 * Check if the requester is an admin.
 */
const isAdmin = (req: Request): boolean => {
  const session = getSessionFromRequest(req);
  return session?.role === "admin" || session?.source === "admins";
};

// GET /posts - Lấy danh sách bài đăng (sắp xếp mới nhất trước)
export const postsListHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    const adminSession = session?.role === "admin" || session?.source === "admins";

    let query = supabase
      .from("posts")
      .select(`
        id,
        topic,
        title,
        content,
        status,
        reviewed_by,
        reviewed_by_admin,
        reviewed_at,
        created_at,
        created_by,
        employees:created_by(
          name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (adminSession) {
      query = query.in("status", ["pending", "published", "rejected"]);
    } else if (session?.source === "employees") {
      query = query.or(`status.eq.published,and(status.eq.pending,created_by.eq.${session.sub})`);
    } else {
      query = query.eq("status", "published");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      res.status(500).json({
        ok: false,
        error: error.message,
        details: "Failed to fetch posts list",
      });
      return;
    }

    if (!data) {
      res.json({ ok: true, data: [] });
      return;
    }

    // Map dữ liệu từ DB sang format frontend cần
    const posts: Post[] = data.map((post: any) => {
      const employee = firstRelatedEmployee(post.employees) as {
        name?: string;
        avatar_url?: string;
      } | null;

      return {
        id: post.id,
        topic: post.topic,
        title: post.title,
        author: employee?.name || "Unknown",
        avatar: employee?.avatar_url || "",
        content: post.content,
        status: post.status ?? "published",
        reviewed_by: post.reviewed_by ?? null,
        reviewed_by_admin: post.reviewed_by_admin ?? null,
        reviewed_at: post.reviewed_at ?? null,
        created_by: post.created_by,
        created_at: post.created_at,
      };
    });

    res.json({ ok: true, data: posts });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
};

// GET /posts/:id - Lấy chi tiết bài đăng
export const postsDetailHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = getSessionFromRequest(req);

    // Validate ID
    if (!id || typeof id !== "string") {
      res.status(400).json({
        ok: false,
        error: "Invalid post ID",
      });
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        topic,
        title,
        content,
        status,
        reviewed_by,
        reviewed_by_admin,
        reviewed_at,
        created_at,
        created_by,
        employees:created_by(
          name,
          avatar_url
        ),
        post_reactions(
          id,
          employee_id,
          reaction_type
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        res.status(404).json({
          ok: false,
          error: "Post not found",
        });
        return;
      }
      console.error("Supabase error:", error);
      res.status(500).json({
        ok: false,
        error: error.message,
      });
      return;
    }

    if (!data) {
      res.status(404).json({
        ok: false,
        error: "Post not found",
      });
      return;
    }

    // Check visibility: non-admin cannot see non-published posts unless they are the author
    if (!isAdmin(req) && data.status !== "published" && data.created_by !== session?.sub) {
      res.status(404).json({
        ok: false,
        error: "Post not found",
      });
      return;
    }

    const employee = firstRelatedEmployee(data.employees) as {
      name?: string;
      avatar_url?: string;
    } | null;

    const post: Post = {
      id: data.id,
      topic: data.topic,
      title: data.title,
      author: employee?.name || "Unknown",
      avatar: employee?.avatar_url || "",
      content: data.content,
      status: data.status ?? "published",
      reviewed_by: data.reviewed_by ?? null,
      reviewed_by_admin: data.reviewed_by_admin ?? null,
      reviewed_at: data.reviewed_at ?? null,
      created_by: data.created_by,
      created_at: data.created_at,
      reactions: data.post_reactions || [],
      reaction_counts: mapReactionCounts(data.post_reactions || []),
    };

    res.json({ ok: true, data: post });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
};

export const createPostHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);

    // Admin cannot create posts
    if (session?.role === "admin" || session?.source === "admins") {
      return res.status(403).json({
        ok: false,
        error: "管理者は投稿を作成できません / Admin không thể tạo bài viết",
      });
    }

    const employeeId = session?.sub ?? getActorEmployeeId(req);
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const topicRaw = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (!employeeId) {
      return res.status(401).json({
        ok: false,
        error: "employee_id or Bearer token is required",
      });
    }

    if (!title) {
      return res.status(400).json({ ok: false, error: "title is required" });
    }

    if (!content) {
      return res.status(400).json({ ok: false, error: "content is required" });
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        topic: topicRaw.length > 0 ? topicRaw : null,
        title,
        content,
        created_by: employeeId,
        status: "pending",
      })
      .select(`
        id,
        topic,
        title,
        content,
        status,
        reviewed_by,
        reviewed_by_admin,
        reviewed_at,
        created_at,
        created_by,
        employees:created_by(
          name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const employee = firstRelatedEmployee(data.employees) as {
      name?: string;
      avatar_url?: string;
    } | null;

    return res.status(201).json({
      ok: true,
      data: {
        id: data.id,
        topic: data.topic,
        title: data.title,
        author: employee?.name || "Unknown",
        avatar: employee?.avatar_url || "",
        content: data.content,
        status: data.status ?? "pending",
        reviewed_by: data.reviewed_by ?? null,
        reviewed_by_admin: data.reviewed_by_admin ?? null,
        reviewed_at: data.reviewed_at ?? null,
        created_by: data.created_by,
        created_at: data.created_at,
      } satisfies Post,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// POST /posts/:id/approve - Admin duyệt bài đăng
export const approvePostHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== "admin") {
      return res.status(403).json({
        ok: false,
        error: "管理者のみが投稿を承認できます / Chỉ admin mới có thể duyệt bài",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    const reviewUpdate =
      session.source === "admins" ? { reviewed_by_admin: session.sub } : { reviewed_by: session.sub };

    const { data, error } = await supabase
      .from("posts")
      .update({
        status: "published",
        ...reviewUpdate,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, title, status, reviewed_by, reviewed_by_admin, reviewed_at")
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// POST /posts/:id/reject - Admin từ chối bài đăng
export const rejectPostHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== "admin") {
      return res.status(403).json({
        ok: false,
        error: "管理者のみが投稿を拒否できます / Chỉ admin mới có thể từ chối bài",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    const reviewUpdate =
      session.source === "admins" ? { reviewed_by_admin: session.sub } : { reviewed_by: session.sub };

    const { data, error } = await supabase
      .from("posts")
      .update({
        status: "rejected",
        ...reviewUpdate,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, title, status, reviewed_by, reviewed_by_admin, reviewed_at")
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const postReactionsHandler = async (req: Request, res: Response) => {
  try {
    const { id: postId } = req.params;
    const { reaction_type } = req.body as { reaction_type?: ReactionType };
    const employeeId = getActorEmployeeId(req);

    if (!postId) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    if (!employeeId) {
      return res.status(401).json({
        ok: false,
        error: "employee_id or Bearer token is required",
      });
    }

    if (!reaction_type || !validReactionTypes.includes(reaction_type)) {
      return res.status(400).json({
        ok: false,
        error: "reaction_type must be one of: like, heart, useful",
      });
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return res.status(500).json({ ok: false, error: postError.message });
    }

    if (!post) {
      return res.status(404).json({ ok: false, error: "Post not found" });
    }

    const { data: existingReaction, error: fetchReactionError } = await supabase
      .from("post_reactions")
      .select("id, reaction_type")
      .eq("post_id", postId)
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (fetchReactionError) {
      return res.status(500).json({ ok: false, error: fetchReactionError.message });
    }

    if (existingReaction) {
      const { data, error } = await supabase
        .from("post_reactions")
        .update({ reaction_type })
        .eq("id", existingReaction.id)
        .select("id, post_id, employee_id, reaction_type")
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.json({
        ok: true,
        action: "updated",
        data,
      });
    }

    const { data, error } = await supabase
      .from("post_reactions")
      .insert({
        post_id: postId,
        employee_id: employeeId,
        reaction_type,
      })
      .select("id, post_id, employee_id, reaction_type")
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({
      ok: true,
      action: "created",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deletePostReactionHandler = async (req: Request, res: Response) => {
  try {
    const { id: postId } = req.params;
    const employeeId = getActorEmployeeId(req);

    if (!postId) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    if (!employeeId) {
      return res.status(401).json({
        ok: false,
        error: "employee_id or Bearer token is required",
      });
    }

    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("employee_id", employeeId);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, action: "deleted" });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getPostReactionsHandler = async (req: Request, res: Response) => {
  try {
    const { id: postId } = req.params;
    const employeeId = getActorEmployeeId(req);

    if (!postId) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    const { data, error } = await supabase
      .from("post_reactions")
      .select("id, employee_id, reaction_type")
      .eq("post_id", postId);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const counts = mapReactionCounts((data ?? []) as Array<{ reaction_type: ReactionType }>);
    const myReaction = employeeId
      ? (data ?? []).find((reaction) => reaction.employee_id === employeeId) ?? null
      : null;

    return res.json({
      ok: true,
      data: {
        counts,
        myReaction,
        reactions: data ?? [],
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
