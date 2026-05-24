import type { Request, Response } from "express";
import crypto from "node:crypto";
import { env } from "../env.js";
import { supabase } from "../supabase.js";

type AuthRole = "employee" | "leader" | "admin";
type AuthSource = "employees" | "admins";
type UserSource = "employees" | "admins";
type UserStatus = "active" | "pending";
type PostStatus = "pending" | "published" | "rejected";

type AuthTokenPayload = {
  sub: string;
  exp: number;
  role: AuthRole;
  source: AuthSource;
};

type EmployeeRow = {
  id: string;
  name: string;
  nationality: "vn" | "jp";
  email: string;
  avatar_url: string | null;
  role: "employee" | "leader";
  last_online: string | null;
  team?: string | null;
  status?: UserStatus | null;
};

type AdminRow = {
  id: string;
  email: string;
};

type RelatedEmployee =
  | {
      name?: string | null;
      avatar_url?: string | null;
    }
  | Array<{
      name?: string | null;
      avatar_url?: string | null;
    }>
  | null
  | undefined;

type ModerationPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  channel: string;
  author: string;
  created_at: string;
  status: PostStatus;
};

type RawModerationPost = {
  id: string;
  topic?: string | null;
  title: string;
  content?: string | null;
  created_at: string;
  status?: PostStatus | null;
  employees?: RelatedEmployee;
};

const validUserStatuses: UserStatus[] = ["active", "pending"];
const validPostStatuses: PostStatus[] = ["pending", "published", "rejected"];

const verifyToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expected) return null;

  try {
    const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadRaw) as Partial<AuthTokenPayload>;
    if (!payload.sub || !payload.exp || payload.exp < Date.now() || !payload.role || !payload.source) return null;
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
};

const requireAdmin = (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Admin token is required" });
    return null;
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload || payload.role !== "admin" || payload.source !== "admins") {
    res.status(403).json({ ok: false, error: "Admin permission is required" });
    return null;
  }

  return payload;
};

const isMissingColumnError = (error: { code?: string; message?: string }, column: string) => {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST204" || message.includes(column.toLowerCase());
};

const getString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const toGeneratedEmail = (name: string) => {
  const localPart =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 40) || "user";

  return `${localPart}.${Date.now()}@kizunavn.local`;
};

const getUserStatus = (value: unknown) =>
  typeof value === "string" && validUserStatuses.includes(value as UserStatus)
    ? (value as UserStatus)
    : undefined;

const employeeFallbackTeam = (employee: EmployeeRow) => {
  if (employee.role === "leader") return "Leadership";
  return employee.nationality === "jp" ? "Operation" : "Content";
};

const employeeStatus = (employee: EmployeeRow): UserStatus => {
  if (employee.status === "active" || employee.status === "pending") {
    return employee.status;
  }

  return employee.last_online ? "active" : "pending";
};

const mapEmployee = (employee: EmployeeRow) => ({
  id: employee.id,
  source: "employees" as const,
  name: employee.name,
  email: employee.email,
  team: employee.team || employeeFallbackTeam(employee),
  role: employee.role,
  status: employeeStatus(employee),
  nationality: employee.nationality,
  avatar_url: employee.avatar_url,
});

const mapAdmin = (admin: AdminRow) => ({
  id: admin.id,
  source: "admins" as const,
  name: admin.email.split("@")[0] || "System Admin",
  email: admin.email,
  team: "Core",
  role: "admin" as const,
  status: "active" as const,
});

const fetchEmployeesForAdmin = async () => {
  const withAdminFields = await supabase
    .from("employees")
    .select("id,name,email,avatar_url,role,nationality,last_online,team,status")
    .order("name", { ascending: true });

  if (!withAdminFields.error) {
    return withAdminFields.data as EmployeeRow[];
  }

  if (!isMissingColumnError(withAdminFields.error, "team") && !isMissingColumnError(withAdminFields.error, "status")) {
    throw new Error(withAdminFields.error.message);
  }

  const fallback = await supabase
    .from("employees")
    .select("id,name,email,avatar_url,role,nationality,last_online")
    .order("name", { ascending: true });

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return (fallback.data ?? []) as EmployeeRow[];
};

export const listManagedUsersHandler = async (_req: Request, res: Response) => {
  try {
    const [employees, adminsResult] = await Promise.all([
      fetchEmployeesForAdmin(),
      supabase.from("admins").select("id,email").order("email", { ascending: true }),
    ]);

    if (adminsResult.error) {
      return res.status(500).json({ ok: false, error: adminsResult.error.message });
    }

    return res.json({
      ok: true,
      data: [
        ...employees.map(mapEmployee),
        ...((adminsResult.data ?? []) as AdminRow[]).map(mapAdmin),
      ],
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const createManagedUserHandler = async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const name = getString(req.body?.name);
    const email = getString(req.body?.email) ?? (name ? toGeneratedEmail(name) : undefined);
    const password = getString(req.body?.password);
    const nationality = req.body?.nationality === "jp" ? "jp" : "vn";
    const role = req.body?.role === "leader" ? "leader" : "employee";
    const status = getUserStatus(req.body?.status) ?? "active";
    const team = getString(req.body?.team);

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: "name, email and password are required" });
    }

    const insertPayload: Record<string, unknown> = {
      name,
      email,
      password,
      nationality,
      role,
      status,
    };

    if (team) {
      insertPayload.team = team;
    }

    let result = await supabase
      .from("employees")
      .insert(insertPayload)
      .select("id,name,email,avatar_url,role,nationality,last_online")
      .single();

    if (result.error && (isMissingColumnError(result.error, "team") || isMissingColumnError(result.error, "status"))) {
      delete insertPayload.team;
      delete insertPayload.status;
      result = await supabase
        .from("employees")
        .insert(insertPayload)
        .select("id,name,email,avatar_url,role,nationality,last_online")
        .single();
    }

    if (result.error) {
      return res.status(400).json({ ok: false, error: result.error.message });
    }

    return res.status(201).json({ ok: true, data: result.data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const updateManagedUserHandler = async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { source, id } = req.params as { source?: UserSource; id?: string };
    if ((source !== "employees" && source !== "admins") || !id) {
      return res.status(400).json({ ok: false, error: "Invalid user target" });
    }

    const updates: Record<string, unknown> = {};
    const email = getString(req.body?.email);
    const password = getString(req.body?.password);

    if (email) updates.email = email;
    if (password) updates.password = password;

    if (source === "employees") {
      const name = getString(req.body?.name);
      const team = getString(req.body?.team);
      const status = getUserStatus(req.body?.status);

      if (name) updates.name = name;
      if (team !== undefined) updates.team = team;
      if (req.body?.nationality === "vn" || req.body?.nationality === "jp") {
        updates.nationality = req.body.nationality;
      }
      if (req.body?.role === "employee" || req.body?.role === "leader") {
        updates.role = req.body.role;
      }
      if (status) {
        updates.status = status;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "No update fields provided" });
    }

    let result = await supabase.from(source).update(updates).eq("id", id).select("id").single();

    if (
      source === "employees" &&
      result.error &&
      (isMissingColumnError(result.error, "team") || isMissingColumnError(result.error, "status"))
    ) {
      const fallbackUpdates = { ...updates };
      const requestedStatus = getUserStatus(req.body?.status);
      delete fallbackUpdates.team;
      delete fallbackUpdates.status;
      if (requestedStatus) {
        fallbackUpdates.last_online = requestedStatus === "active" ? new Date().toISOString() : null;
      }

      result = await supabase.from(source).update(fallbackUpdates).eq("id", id).select("id").single();
    }

    if (result.error) {
      return res.status(400).json({ ok: false, error: result.error.message });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deleteManagedUserHandler = async (req: Request, res: Response) => {
  try {
    const session = requireAdmin(req, res);
    if (!session) return;

    const { source, id } = req.params as { source?: UserSource; id?: string };
    if ((source !== "employees" && source !== "admins") || !id) {
      return res.status(400).json({ ok: false, error: "Invalid user target" });
    }

    if (source === "admins" && id === session.sub) {
      return res.status(400).json({ ok: false, error: "Cannot delete the current admin account" });
    }

    const { error } = await supabase.from(source).delete().eq("id", id);

    if (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

const postSelectWithStatus = `
  id,
  topic,
  title,
  content,
  created_at,
  created_by,
  status,
  employees:created_by(
    name,
    avatar_url
  )
`;

const postSelectBase = `
  id,
  topic,
  title,
  content,
  created_at,
  created_by,
  employees:created_by(
    name,
    avatar_url
  )
`;

const postSummary = (content: string) => {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 80) return normalized;
  return `${normalized.slice(0, 80)}...`;
};

const getRelatedEmployee = (employee: RelatedEmployee) =>
  Array.isArray(employee) ? employee[0] : employee;

const mapPost = (post: RawModerationPost): ModerationPost => ({
  id: post.id,
  title: post.title,
  summary: postSummary(post.content ?? ""),
  content: post.content ?? "",
  channel: post.topic || "Bảng tin",
  author: getRelatedEmployee(post.employees)?.name || "Unknown",
  created_at: post.created_at,
  status: post.status && validPostStatuses.includes(post.status) ? post.status : "pending",
});

export const listPendingPostsHandler = async (_req: Request, res: Response) => {
  try {
    const result = await supabase
      .from("posts")
      .select(postSelectWithStatus)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!result.error) {
      return res.json({
        ok: true,
        data: (result.data ?? []).map(mapPost),
      });
    }

    if (!isMissingColumnError(result.error, "status")) {
      return res.status(500).json({ ok: false, error: result.error.message });
    }

    const fallback = await supabase
      .from("posts")
      .select(postSelectBase)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fallback.error) {
      return res.status(500).json({ ok: false, error: fallback.error.message });
    }

    return res.json({
      ok: true,
      data: (fallback.data ?? []).map(mapPost),
      warning: "Run server/admin_moderation.schema.sql to enable post moderation status.",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const getModerationPostHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    let result = await supabase.from("posts").select(postSelectWithStatus).eq("id", id).maybeSingle();

    if (result.error && isMissingColumnError(result.error, "status")) {
      result = await supabase.from("posts").select(postSelectBase).eq("id", id).maybeSingle();
    }

    if (result.error) {
      return res.status(500).json({ ok: false, error: result.error.message });
    }

    if (!result.data) {
      return res.status(404).json({ ok: false, error: "Post not found" });
    }

    return res.json({ ok: true, data: mapPost(result.data) });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const moderatePostHandler = async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const status = req.body?.status as PostStatus | undefined;

    if (!id) {
      return res.status(400).json({ ok: false, error: "Invalid post ID" });
    }

    if (status !== "published" && status !== "rejected") {
      return res.status(400).json({ ok: false, error: "status must be published or rejected" });
    }

    const result = await supabase
      .from("posts")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .maybeSingle();

    if (result.error) {
      if (isMissingColumnError(result.error, "status")) {
        return res.status(500).json({
          ok: false,
          error: "Post moderation status column is missing. Run server/admin_moderation.schema.sql in Supabase.",
        });
      }

      return res.status(500).json({ ok: false, error: result.error.message });
    }

    if (!result.data) {
      return res.status(404).json({ ok: false, error: "Post not found" });
    }

    return res.json({ ok: true, data: result.data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
