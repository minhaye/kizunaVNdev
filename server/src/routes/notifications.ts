import type { Request, Response } from "express";
import { getSessionFromRequest } from "../lib/session.js";
import { listUserNotifications, markAllUserNotificationsRead } from "../lib/notifications.js";

export const listNotificationsHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
    }

    const result = await listUserNotifications(session);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

export const markNotificationsReadHandler = async (req: Request, res: Response) => {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
    }

    await markAllUserNotificationsRead(session);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};
