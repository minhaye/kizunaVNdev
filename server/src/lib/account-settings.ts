import { supabase } from "../supabase.js";
import type { AuthSource, SessionPayload } from "./session.js";

export type ThemeMode = "light" | "dark";

export type AccountSettingsRow = {
  source: AuthSource;
  subject_id: string;
  theme_mode: ThemeMode;
  message_task_notifications: boolean;
  login_retention_days: number;
  show_active_status: boolean;
  last_online: string | null;
  updated_at: string;
};

export type AccountSettingsPatch = Partial<Pick<
  AccountSettingsRow,
  "theme_mode" | "message_task_notifications" | "login_retention_days" | "show_active_status"
>>;

export const defaultAccountSettings = (): AccountSettingsPatch => ({
  theme_mode: "light",
  message_task_notifications: true,
  login_retention_days: 30,
  show_active_status: true,
});

const normalizeThemeMode = (value: unknown): ThemeMode => (value === "dark" ? "dark" : "light");

const tableMissing = (message: string) =>
  message.includes("Could not find the table") || message.includes("schema cache");

export const loadAccountSettings = async (session: SessionPayload) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("source,subject_id,theme_mode,message_task_notifications,login_retention_days,show_active_status,last_online,updated_at")
    .eq("source", session.source)
    .eq("subject_id", session.sub)
    .maybeSingle<AccountSettingsRow>();

  if (error) {
    if (tableMissing(error.message)) {
      return { ...defaultAccountSettings(), last_online: null, updated_at: new Date().toISOString() } as AccountSettingsRow;
    }

    throw new Error(error.message);
  }

  if (data) {
    return {
      ...data,
      theme_mode: normalizeThemeMode(data.theme_mode),
    };
  }

  const nowIso = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("user_settings")
    .insert({
      source: session.source,
      subject_id: session.sub,
      ...defaultAccountSettings(),
      last_online: null,
      updated_at: nowIso,
    })
    .select("source,subject_id,theme_mode,message_task_notifications,login_retention_days,show_active_status,last_online,updated_at")
    .single<AccountSettingsRow>();

  if (insertError) {
    if (tableMissing(insertError.message)) {
      return { ...defaultAccountSettings(), last_online: null, updated_at: nowIso } as AccountSettingsRow;
    }

    throw new Error(insertError.message);
  }

  return inserted as AccountSettingsRow;
};

export const saveAccountSettings = async (session: SessionPayload, patch: AccountSettingsPatch) => {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        source: session.source,
        subject_id: session.sub,
        ...defaultAccountSettings(),
        ...patch,
        updated_at: nowIso,
      },
      { onConflict: "source,subject_id" },
    )
    .select("source,subject_id,theme_mode,message_task_notifications,login_retention_days,show_active_status,last_online,updated_at")
    .single<AccountSettingsRow>();

  if (error) {
    if (tableMissing(error.message)) {
      return { ...defaultAccountSettings(), last_online: null, updated_at: nowIso } as AccountSettingsRow;
    }

    throw new Error(error.message);
  }

  return data as AccountSettingsRow;
};

export const touchAccountHeartbeat = async (session: SessionPayload) => {
  const nowIso = new Date().toISOString();

  if (session.source === "employees") {
    const { error } = await supabase.from("employees").update({ last_online: nowIso }).eq("id", session.sub);
    if (error && !tableMissing(error.message)) {
      throw new Error(error.message);
    }
    return nowIso;
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        source: session.source,
        subject_id: session.sub,
        ...defaultAccountSettings(),
        last_online: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "source,subject_id" },
    );

  if (error && !tableMissing(error.message)) {
    throw new Error(error.message);
  }

  return nowIso;
};