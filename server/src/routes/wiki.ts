import type { Request, Response } from "express";
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