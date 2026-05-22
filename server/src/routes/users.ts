import type { Request, Response } from "express";
import { loadAccountSettings } from "../lib/account-settings.js";
import { getSessionFromRequest, type SessionPayload } from "../lib/session.js";
import { supabase } from "../supabase.js";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  team: string;
  role: "employee" | "leader" | "admin";
  source: "employees" | "admins";
  avatar_url: string | null;
  last_online: string | null;
  status: "active";
  is_online: boolean;
};

const recentOnlineWindowMs = 5 * 60 * 1000;

const isRecentOnline = (lastOnline: string | null) => {
  if (!lastOnline) return false;

  const timestamp = new Date(lastOnline).getTime();
  if (Number.isNaN(timestamp)) return false;

  return Date.now() - timestamp <= recentOnlineWindowMs;
};

const requirePrivilegedSession = (req: Request, res: Response) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
    return null;
  }

  if (session.role !== "admin") {
    res.status(403).json({ error: "Bạn không có quyền xem danh sách người dùng" });
    return null;
  }

  return session;
};

const mapEmployeeRow = (employee: {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: "employee" | "leader";
  nationality: "vn" | "jp";
  last_online: string | null;
}): ManagedUser => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  team: employee.nationality === "jp" ? "JP Staff" : "VN Staff",
  role: employee.role,
  source: "employees",
  avatar_url: employee.avatar_url,
  last_online: employee.last_online,
  status: "active",
  is_online: isRecentOnline(employee.last_online),
});

const mapAdminRow = (admin: {
  id: string;
  email: string;
  last_online: string | null;
}): ManagedUser => ({
  id: admin.id,
  name: admin.email.split("@")[0] || "Admin",
  email: admin.email,
  team: "Core",
  role: "admin",
  source: "admins",
  avatar_url: null,
  last_online: admin.last_online,
  status: "active",
  is_online: isRecentOnline(admin.last_online),
});

export const usersHandler = async (req: Request, res: Response) => {
  try {
    const session = requirePrivilegedSession(req, res);
    if (!session) return;

    const [{ data: employees, error: employeesError }, { data: admins, error: adminsError }] = await Promise.all([
      supabase
        .from("employees")
        .select("id,name,email,avatar_url,role,nationality,last_online")
        .order("last_online", { ascending: false, nullsFirst: false }),
      supabase
        .from("admins")
        .select("id,email")
        .order("email", { ascending: true }),
    ]);

    if (employeesError) {
      return res.status(500).json({ error: employeesError.message });
    }

    if (adminsError) {
      return res.status(500).json({ error: adminsError.message });
    }

    const adminSessions: SessionPayload[] = (admins ?? []).map((admin) => ({
      sub: admin.id,
      exp: Date.now() + 60_000,
      role: "admin",
      source: "admins",
    }));

    const adminSettingsList = await Promise.all(
      adminSessions.map((adminSession) =>
        loadAccountSettings(adminSession).catch(() => null),
      ),
    );

    const users: ManagedUser[] = [
      ...((employees ?? []).map(mapEmployeeRow)),
      ...((admins ?? []).map((admin, index) => mapAdminRow({ ...admin, last_online: adminSettingsList[index]?.last_online ?? null }))),
    ].sort((left, right) => left.name.localeCompare(right.name, "vi", { sensitivity: "base" }));

    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const createUserHandler = async (req: Request, res: Response) => {
  try {
    const session = requirePrivilegedSession(req, res);
    if (!session) return;

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const nationality = req.body?.nationality === "jp" ? "jp" : req.body?.nationality === "vn" ? "vn" : "";
    const role = req.body?.role === "leader" ? "leader" : "employee";
    const avatarUrl = typeof req.body?.avatar_url === "string" && req.body.avatar_url.trim().length > 0
      ? req.body.avatar_url.trim()
      : null;

    if (!name || !email || !password || !nationality) {
      return res.status(400).json({
        error: "Thiếu trường bắt buộc: name, email, password, nationality.",
      });
    }

    const { data, error } = await supabase
      .from("employees")
      .insert({
        name,
        email,
        password,
        nationality,
        role,
        avatar_url: avatarUrl,
      })
      .select("id,name,email,avatar_url,role,nationality,last_online")
      .single();

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        return res.status(409).json({ error: "Email này đã tồn tại." });
      }

      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      user: {
        ...data,
        team: data.role === "leader" ? "Leadership" : data.nationality === "jp" ? "JP Staff" : "VN Staff",
        source: "employees" as const,
        status: "active" as const,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};