import type { Request, Response } from "express";
import { supabase } from "../supabase";

export const listNotificationsHandler = async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, created_at, topic, title, content")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ notifications: data ?? [] });
};
