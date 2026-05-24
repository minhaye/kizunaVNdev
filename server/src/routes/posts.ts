import type { Request, Response } from "express";
import crypto from "node:crypto";
import { supabase } from "../supabase";
import type { Post, ReactionType } from "../types";

type JwtLikePayload = {
  sub: string;
  exp: number;
};

const validReactionTypes: ReactionType[] = ["like", "heart", "useful"];

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

type RawPostRow = {
  id: string;
  topic?: string | null;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  employees?: RelatedEmployee;
  post_reactions?: Array<{
    id: string;
    employee_id: string;
    reaction_type: ReactionType;
  }>;
};

const getRelatedEmployee = (employee: RelatedEmployee) =>
  Array.isArray(employee) ? employee[0] : employee;

const isMissingColumnError = (error: { code?: string; message?: string }, column: string) => {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST204" || message.includes(column.toLowerCase());
};

const postListSelect = `
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

const postListSelectFallback = `
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

// GET /posts - Lấy danh sách bài đăng (sắp xếp mới nhất trước)
export const postsListHandler = async (_req: Request, res: Response) => {
  try {
    const publishedResult = await supabase
      .from("posts")
      .select(postListSelect)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);

    let data = publishedResult.data as RawPostRow[] | null;
    let error = publishedResult.error;

    if (error && isMissingColumnError(error, "status")) {
      const fallbackResult = await supabase
        .from("posts")
        .select(postListSelectFallback)
        .order("created_at", { ascending: false })
        .limit(100);

      data = fallbackResult.data as RawPostRow[] | null;
      error = fallbackResult.error;
    }

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
    const posts: Post[] = data.map((post) => {
      const employee = getRelatedEmployee(post.employees);

      return {
        id: post.id,
        topic: post.topic ?? undefined,
        title: post.title,
        author: employee?.name || "Unknown",
        avatar: employee?.avatar_url || "",
        content: post.content,
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

    const relatedEmployee = getRelatedEmployee((data as RawPostRow).employees);

    const post: Post = {
      id: data.id,
      topic: data.topic,
      title: data.title,
      author: relatedEmployee?.name || "Unknown",
      avatar: relatedEmployee?.avatar_url || "",
      content: data.content,
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
