import type { Request, Response } from "express";
import { supabase } from "../supabase";

export const dbPingHandler = async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from("employees").select("*").limit(1);

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.json({ ok: true, sample: data?.[0] ?? null });
};
