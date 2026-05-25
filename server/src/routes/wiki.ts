import type { Request, Response } from "express";
import crypto from "node:crypto";
import { supabase } from "../supabase.js";

type WikiArticleRow = {
  id: string;
  topic: string | null;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
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

export const listWikiArticlesHandler = async (req: Request, res: Response) => {
  try {
    const limit = sanitizeLimit(req.query.limit, 100, 500);

    const { data, error } = await supabase
      .from("wiki_articles")
      .select("id,topic,title,content,created_by,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const articles = ((data ?? []) as WikiArticleRow[]).map((article) => ({
      id: article.id,
      slug: article.id,
      tag: normalizeTag(article.topic),
      title: article.title,
      content: article.content,
      created_by: article.created_by,
      created_at: article.created_at,
      updated_at: article.updated_at,
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

    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "Invalid wiki slug" });
    }

    const { data, error } = await supabase
      .from("wiki_articles")
      .select("id,topic,title,content,created_by,created_at,updated_at")
      .eq("id", slug.trim())
      .maybeSingle<WikiArticleRow>();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data) {
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
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
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
    const createdBy = getActorEmployeeId(req);
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
      })
      .select("id,topic,title,content,created_by,created_at,updated_at")
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
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
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
