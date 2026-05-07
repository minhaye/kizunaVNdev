import type { Request, Response } from "express";

export const healthHandler = (_req: Request, res: Response) => {
  res.json({ ok: true, service: "kizunavn-server" });
};
