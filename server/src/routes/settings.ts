import type { Request, Response } from "express";
import { getSessionFromRequest } from "../lib/session.js";
import { loadAccountSettings, saveAccountSettings, touchAccountHeartbeat } from "../lib/account-settings.js";

const requireSession = (req: Request, res: Response) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
    return null;
  }

  return session;
};

export const getMySettingsHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const settings = await loadAccountSettings(session);
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateMySettingsHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const themeMode = req.body?.theme_mode;
    const messageTaskNotifications = req.body?.message_task_notifications;
    const loginRetentionDays = req.body?.login_retention_days;
    const showActiveStatus = req.body?.show_active_status;

    const settings = await saveAccountSettings(session, {
      theme_mode: themeMode === "dark" ? "dark" : themeMode === "light" ? "light" : undefined,
      message_task_notifications:
        typeof messageTaskNotifications === "boolean" ? messageTaskNotifications : undefined,
      login_retention_days:
        loginRetentionDays === 30 || loginRetentionDays === 60 || loginRetentionDays === 90
          ? loginRetentionDays
          : undefined,
      show_active_status: typeof showActiveStatus === "boolean" ? showActiveStatus : undefined,
    });

    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const heartbeatHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const lastOnline = await touchAccountHeartbeat(session);
    return res.json({ success: true, last_online: lastOnline });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};