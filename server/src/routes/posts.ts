import type { Request, Response } from "express";
import { supabase } from "../supabase";
import type { Post } from "../types";

// GET /posts - Lấy danh sách bài đăng (sắp xếp mới nhất trước)
export const postsListHandler = async (_req: Request, res: Response) => {
  try {
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
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

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
    const posts: Post[] = data.map((post: any) => ({
      id: post.id,
      topic: post.topic,
      title: post.title,
      author: post.employees?.name || "Unknown",
      avatar: post.employees?.avatar_url || "",
      content: post.content,
      created_by: post.created_by,
      created_at: post.created_at,
    }));

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

    const post: Post = {
      id: data.id,
      topic: data.topic,
      title: data.title,
      author: data.employees?.name || "Unknown",
      avatar: data.employees?.avatar_url || "",
      content: data.content,
      created_by: data.created_by,
      created_at: data.created_at,
      reactions: data.post_reactions || [],
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
