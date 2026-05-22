import { supabase } from "../supabase.js";
import type { AccountSettingsRow } from "./account-settings.js";
import { loadAccountSettings } from "./account-settings.js";
import type { SessionPayload } from "./session.js";

export type UserNotificationRow = {
  id: string;
  source: "employees" | "admins";
  subject_id: string;
  topic: string;
  title: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const tableMissing = (message: string) =>
  message.includes("Could not find the table") || message.includes("schema cache");

export const insertUserNotifications = async (
  rows: Array<Pick<UserNotificationRow, "source" | "subject_id" | "topic" | "title" | "content" | "link">>,
) => {
  if (rows.length === 0) return true;

  const { error } = await supabase.from("user_notifications").insert(
    rows.map((row) => ({
      ...row,
      is_read: false,
    })),
  );

  if (error) {
    if (tableMissing(error.message)) {
      return false;
    }

    throw new Error(error.message);
  }

  return true;
};

const shouldHideBySettings = (notification: Pick<UserNotificationRow, "topic">, settings: AccountSettingsRow) => {
  if (settings.message_task_notifications) return false;
  return ["task", "chat", "Task", "Chat"].includes(notification.topic);
};

export const listUserNotifications = async (session: SessionPayload) => {
  const settings = await loadAccountSettings(session).catch(() => null);

  const { data, error } = await supabase
    .from("user_notifications")
    .select("id,source,subject_id,topic,title,content,link,is_read,created_at")
    .eq("source", session.source)
    .eq("subject_id", session.sub)
    .order("created_at", { ascending: false });

  if (error) {
    if (tableMissing(error.message)) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("notifications")
        .select("id,created_at,topic,title,content")
        .order("created_at", { ascending: false });

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return {
        notifications: (fallback ?? []).map((item) => ({
          ...item,
          source: session.source,
          subject_id: session.sub,
          link: null,
          is_read: false,
        })) as UserNotificationRow[],
        unread_count: (fallback ?? []).length,
      };
    }

    throw new Error(error.message);
  }

  const notifications = (data ?? []) as UserNotificationRow[];
  const visibleNotifications = settings ? notifications.filter((notification) => !shouldHideBySettings(notification, settings)) : notifications;

  return {
    notifications: visibleNotifications,
    unread_count: visibleNotifications.filter((notification) => !notification.is_read).length,
  };
};

export const markAllUserNotificationsRead = async (session: SessionPayload) => {
  const { error } = await supabase
    .from("user_notifications")
    .update({ is_read: true })
    .eq("source", session.source)
    .eq("subject_id", session.sub)
    .eq("is_read", false);

  if (error) {
    if (tableMissing(error.message)) {
      return true;
    }

    throw new Error(error.message);
  }

  return true;
};