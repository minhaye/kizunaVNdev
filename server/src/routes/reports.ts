import type { Request, Response } from "express";
import crypto from "node:crypto";
import { supabase } from "../supabase.js";
import { env } from "../env.js";

type AuthRole = "employee" | "leader" | "admin";
type AuthSource = "employees" | "admins";

type SessionPayload = {
  sub: string;
  exp: number;
  role: AuthRole;
  source: AuthSource;
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: AuthRole;
  nationality: "vn" | "jp";
};

type ReportRow = {
  id: string;
  task_id: string;
  sender_id: string;
  report_type: string;
  what_done: string | null;
  what_next: string | null;
  issues: string | null;
  created_at: string;
};

const verifyToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expected) return null;

  const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
  const payload = JSON.parse(payloadRaw) as Partial<SessionPayload>;

  if (!payload.sub || !payload.exp || payload.exp < Date.now() || !payload.role || !payload.source) {
    return null;
  }

  return payload as SessionPayload;
};

const getSession = (req: Request) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return verifyToken(authHeader.slice(7));
};

const loadEmployees = async () => {
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,email,avatar_url,role,nationality")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EmployeeRow[];
};

const getCurrentEmployee = async (session: SessionPayload) => {
  if (session.source === "admins") {
    return null;
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id,name,email,avatar_url,role,nationality")
    .eq("id", session.sub)
    .maybeSingle<EmployeeRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
};

const requireSession = (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Token không hợp lệ hoặc hết hạn" });
    return null;
  }

  return session;
};

export const listTaskReportsHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing task id" });

    const [{ data: reportsData, error: reportsError }, employees] = await Promise.all([
      supabase
        .from("task_reports")
        .select("*")
        .eq("task_id", id)
        .order("created_at", { ascending: false }),
      loadEmployees(),
    ] as const);

    if (reportsError) {
      return res.status(400).json({ error: reportsError.message });
    }

    const reports = (reportsData ?? []) as ReportRow[];

    // permission: admins can view; employees can view if assigner/assignee/leader
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("assigner_id,assignee_id")
      .eq("id", id)
      .maybeSingle();

    const currentEmployee = await getCurrentEmployee(session);

    let isAllowed = session.source === "admins";
    if (!isAllowed) {
      if (taskData && (taskData.assigner_id === session.sub || taskData.assignee_id === session.sub)) {
        isAllowed = true;
      }
      if (currentEmployee?.role === "leader") isAllowed = true;
    }

    if (!isAllowed) {
      return res.status(403).json({ error: "Bạn không có quyền xem báo cáo này" });
    }

    const empMap = new Map(employees.map((e) => [e.id, e] as const));

    const enriched = reports.map((r) => ({
      id: r.id,
      task_id: r.task_id,
      report_type: r.report_type,
      what_done: r.what_done,
      what_next: r.what_next,
      issues: r.issues,
      created_at: r.created_at,
      sender_id: r.sender_id,
      sender_name: empMap.get(r.sender_id)?.name ?? r.sender_id,
      sender_email: empMap.get(r.sender_id)?.email ?? null,
    }));

    return res.json({ success: true, reports: enriched, session });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

const sendNotificationToTaskStakeholders = async (taskId: string, report: ReportRow) => {
  try {
    const { data: task, error } = await supabase
      .from("tasks")
      .select("assigner_id,assignee_id,title")
      .eq("id", taskId)
      .maybeSingle();

    if (error || !task) return;

    const recipients = new Set<string>([task.assigner_id, task.assignee_id]);
    recipients.delete(report.sender_id);

    // Placeholder: real implementation should send emails/notifications.
    console.log("[通知] Gửi thông báo Ho-Ren-So tới:", Array.from(recipients), "報告ID:", report.id);
  } catch (e) {
    // swallow notification errors
    console.warn("Failed to send notifications", e);
  }
};

export const createTaskReportHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const { id } = req.params;
    const { reportType, whatDone, whatNext, issues } = req.body as {
      reportType?: string;
      whatDone?: string;
      whatNext?: string;
      issues?: string;
    };

    if (!id) return res.status(400).json({ error: "Missing task id" });
    if (!whatDone || !whatNext) {
      return res.status(400).json({ error: "必須フィールドが不足しています: whatDone / whatNext" });
    }

    // permission: only admins, leaders, assigner or assignee can post
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("assigner_id,assignee_id")
      .eq("id", id)
      .maybeSingle();

    if (taskError) return res.status(400).json({ error: taskError.message });

    const currentEmployee = await getCurrentEmployee(session);

    let isAllowed = session.source === "admins";
    if (!isAllowed) {
      if (currentEmployee?.role === "leader") isAllowed = true;
      if (taskData && taskData.assignee_id === session.sub) isAllowed = true;
      if (taskData && taskData.assigner_id === session.sub) isAllowed = true;
    }

    if (!isAllowed) {
      return res.status(403).json({ error: "Bạn không có quyền gửi báo cáo cho task này" });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("task_reports")
      .insert({
        task_id: id,
        sender_id: session.sub,
        report_type: (reportType ?? "daily").trim(),
        what_done: whatDone?.trim() ?? null,
        what_next: whatNext?.trim() ?? null,
        issues: issues?.trim() ?? null,
      })
      .select("*")
      .maybeSingle<ReportRow>();

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    const reportRow = inserted as ReportRow;

    // best-effort notification
    void sendNotificationToTaskStakeholders(id, reportRow);

    const employees = await loadEmployees();
    const empMap = new Map(employees.map((e) => [e.id, e] as const));

    const enriched = {
      id: reportRow.id,
      task_id: reportRow.task_id,
      report_type: reportRow.report_type,
      what_done: reportRow.what_done,
      what_next: reportRow.what_next,
      issues: reportRow.issues,
      created_at: reportRow.created_at,
      sender_id: reportRow.sender_id,
      sender_name: empMap.get(reportRow.sender_id)?.name ?? reportRow.sender_id,
      sender_email: empMap.get(reportRow.sender_id)?.email ?? null,
    };

    return res.status(201).json({ success: true, report: enriched });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};
