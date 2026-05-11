import type { Request, Response } from "express";
import { supabase } from "../supabase.js";

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