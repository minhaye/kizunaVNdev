import type { Request, Response } from "express";
import crypto from "node:crypto";
import { supabase } from "../supabase.js";
import { getSessionFromRequest } from "../lib/session.js";
import type { WikiArticleStatus } from "../types.js";

type WikiArticleRow = {
  id: string;
  topic: string | null;
  title: string;
  content: string;
  status: WikiArticleStatus;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

const sanitizeLimit = (raw: unknown, fallback: number, max: number) => {
  const value = typeof raw === "string" ? Number(raw) : Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
};

const normalizeTag = (topic: string | null) => {
  const cleaned = topic?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : "General";
};

type JwtLikePayload = {
  sub: string;
  exp: number;
};

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

/**
 * Get the visible status filter based on user role.
 * - Admin: sees all (pending, approved, rejected)
 * - Staff/leader: sees only approved
 */
const getVisibleStatuses = (req: Request): WikiArticleStatus[] => {
  const session = getSessionFromRequest(req);
  if (session?.role === "admin" || session?.source === "admins") {
    return ["pending", "approved", "rejected"];
  }
  return ["approved"];
};

/**
 * Check if the requester is an admin.
 */
const isAdmin = (req: Request): boolean => {
  const session = getSessionFromRequest(req);
  return session?.role === "admin" || session?.source === "admins";
};

export const listWikiArticlesHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    const adminSession = session?.role === "admin" || session?.source === "admins";
    const limit = sanitizeLimit(req.query.limit, 100, 500);

    let query = supabase
      .from("wiki_articles")
      .select("id,topic,title,content,status,created_by,created_at,updated_at,reviewed_by,reviewed_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (adminSession) {
      query = query.in("status", ["pending", "approved", "rejected"]);
    } else if (session?.source === "employees") {
      query = query.or(`status.eq.approved,and(status.eq.pending,created_by.eq.${session.sub})`);
    } else {
      query = query.eq("status", "approved");
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const articles = ((data ?? []) as WikiArticleRow[]).map((article) => ({
      id: article.id,
      slug: article.id,
      tag: normalizeTag(article.topic),
      title: article.title,
      content: article.content,
      status: article.status ?? "approved",
      created_by: article.created_by,
      created_at: article.created_at,
      updated_at: article.updated_at,
      reviewed_by: article.reviewed_by ?? null,
      reviewed_at: article.reviewed_at ?? null,
    }));

    return res.json({ ok: true, data: articles });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getWikiArticleDetailHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const session = getSessionFromRequest(req);

    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "Invalid wiki slug" });
    }

    const { data, error } = await supabase
      .from("wiki_articles")
      .select("id,topic,title,content,status,created_by,created_at,updated_at,reviewed_by,reviewed_at")
      .eq("id", slug.trim())
      .maybeSingle<WikiArticleRow>();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ ok: false, error: "Wiki article not found" });
    }

    // Check visibility: non-admin cannot see non-approved articles unless they are the author
    if (!isAdmin(req) && data.status !== "approved" && data.created_by !== session?.sub) {
      return res.status(404).json({ ok: false, error: "Wiki article not found" });
    }

    return res.json({
      ok: true,
      data: {
        id: data.id,
        slug: data.id,
        tag: normalizeTag(data.topic),
        title: data.title,
        content: data.content,
        status: data.status ?? "approved",
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        reviewed_by: data.reviewed_by ?? null,
        reviewed_at: data.reviewed_at ?? null,
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

export const createWikiArticleHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);

    // Admin cannot create wiki articles
    if (session?.role === "admin" || session?.source === "admins") {
      return res.status(403).json({
        ok: false,
        error: "管理者はWiki記事を作成できません / Admin không thể tạo bài viết Wiki",
      });
    }

    const createdBy = session?.sub ?? getActorEmployeeId(req);
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const topicRaw = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (!createdBy) {
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
      .from("wiki_articles")
      .insert({
        topic: topicRaw.length > 0 ? topicRaw : null,
        title,
        content,
        created_by: createdBy,
        status: "pending",
      })
      .select("id,topic,title,content,status,created_by,created_at,updated_at,reviewed_by,reviewed_at")
      .single<WikiArticleRow>();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({
      ok: true,
      data: {
        id: data.id,
        slug: data.id,
        tag: normalizeTag(data.topic),
        title: data.title,
        content: data.content,
        status: data.status ?? "pending",
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        reviewed_by: data.reviewed_by ?? null,
        reviewed_at: data.reviewed_at ?? null,
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

// POST /wiki/:id/approve - Admin duyệt bài viết Wiki
export const approveWikiArticleHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== "admin") {
      return res.status(403).json({
        ok: false,
        error: "管理者のみがWiki記事を承認できます / Chỉ admin mới có thể duyệt bài Wiki",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ ok: false, error: "Invalid article ID" });
    }

    const reviewedBy = session.source === "admins" ? null : session.sub;

    const { data, error } = await supabase
      .from("wiki_articles")
      .update({
        status: "approved",
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, title, status, reviewed_by, reviewed_at")
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

// POST /wiki/:id/reject - Admin từ chối bài viết Wiki
export const rejectWikiArticleHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== "admin") {
      return res.status(403).json({
        ok: false,
        error: "管理者のみがWiki記事を拒否できます / Chỉ admin mới có thể từ chối bài Wiki",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ ok: false, error: "Invalid article ID" });
    }

    const reviewedBy = session.source === "admins" ? null : session.sub;

    const { data, error } = await supabase
      .from("wiki_articles")
      .update({
        status: "rejected",
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, title, status, reviewed_by, reviewed_at")
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
