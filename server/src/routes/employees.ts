import type { Request, Response } from "express";
import { supabase } from "../supabase.js";

type FeedbackRow = {
  id: string;
  receiver_id: string;
  sender_id: string;
  content: string;
  employees?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
};

const firstEmployee = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

export const employeesHandler = async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,email,avatar_url,role,nationality,last_online")
    .order("name", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    success: true,
    employees: data ?? [],
  });
};

export const employeeFeedbacksHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid employee ID" });
  }

  const { data, error } = await supabase
    .from("feedbacks")
    .select("id,receiver_id,sender_id,content,employees:sender_id(id,name,avatar_url)")
    .eq("receiver_id", id)
    .order("id", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const feedbacks = (data ?? []).map((feedback) => ({
    ...feedback,
    employees: firstEmployee(feedback.employees) as FeedbackRow["employees"],
  })) as FeedbackRow[];

  return res.json({
    success: true,
    feedbacks,
  });
};