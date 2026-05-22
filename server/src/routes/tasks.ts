import type { Request, Response } from "express";
import crypto from "node:crypto";
import { supabase } from "../supabase.js";
import { env } from "../env.js";
import { insertUserNotifications } from "../lib/notifications.js";

type DbStatus = "pending" | "in_progress" | "completed";
type UiStatus = "todo" | "doing" | "done";
type AuthRole = "employee" | "leader" | "admin";
type AuthSource = "employees" | "admins";

type SessionPayload = {
  sub: string;
  exp: number;
  role: AuthRole;
  source: AuthSource;
};

type TaskRow = {
  id: string;
  assigner_id: string;
  assignee_id: string;
  topic: string | null;
  title: string;
  content: string | null;
  status: DbStatus;
  created_at: string;
  deadline: string | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: AuthRole;
  nationality: "vn" | "jp";
};

const dbToUiStatus = (status: DbStatus): UiStatus => {
  if (status === "completed") return "done";
  if (status === "in_progress") return "doing";
  return "todo";
};

const uiToDbStatus = (status: UiStatus): DbStatus => {
  if (status === "done") return "completed";
  if (status === "doing") return "in_progress";
  return "pending";
};

const isPastDate = (value: string) => {
  const trimmed = value.trim();
  const parsed = trimmed.includes("T") ? new Date(trimmed) : new Date(`${trimmed}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return true;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (!trimmed.includes("T")) {
    return parsed < today;
  }

  return parsed < now;
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

const loadTasks = async () => {
  const { data, error } = await supabase
    .from("tasks")
    .select("id,assigner_id,assignee_id,topic,title,content,status,created_at,deadline")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TaskRow[];
};

const hydrateTasks = (tasks: TaskRow[], employees: EmployeeRow[]) => {
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee] as const));

  return tasks.map((task) => {
    const assigner = employeeMap.get(task.assigner_id);
    const assignee = employeeMap.get(task.assignee_id);

    return {
      id: task.id,
      topic: task.topic,
      title: task.title,
      content: task.content,
      created_at: task.created_at,
      deadline: task.deadline,
      status: dbToUiStatus(task.status),
      status_db: task.status,
      assigner_id: task.assigner_id,
      assignee_id: task.assignee_id,
      assigner_name: assigner?.name ?? task.assigner_id,
      assignee_name: assignee?.name ?? task.assignee_id,
      assigner_role: assigner?.role ?? null,
      assignee_role: assignee?.role ?? null,
    };
  });
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

export const listTasksHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const [tasks, employees] = await Promise.all([loadTasks(), loadEmployees()]);

    const statusFilter = typeof req.query.status === "string" ? req.query.status : "all";
    const assigneeFilter = typeof req.query.assigneeId === "string" ? req.query.assigneeId : null;

    const visibleTasks = hydrateTasks(tasks, employees).filter((task) => {
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter || task.status_db === statusFilter;
      const matchesAssignee = !assigneeFilter || task.assignee_id === assigneeFilter;
      return matchesStatus && matchesAssignee;
    });

    // Fetch report counts per task from task_reports
    const taskIds = visibleTasks.map((t) => t.id);
    let reportCountMap: Record<string, { count: number; latest_at: string | null }> = {};

    if (taskIds.length > 0) {
      const { data: reportRows } = await supabase
        .from("task_reports")
        .select("task_id,created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });

      if (reportRows && reportRows.length > 0) {
        for (const row of reportRows) {
          const tid = row.task_id as string;
          if (!reportCountMap[tid]) {
            reportCountMap[tid] = { count: 0, latest_at: row.created_at as string };
          }
          reportCountMap[tid].count += 1;
        }
      }
    }

    const enrichedTasks = visibleTasks.map((task) => ({
      ...task,
      report_count: reportCountMap[task.id]?.count ?? 0,
      latest_report_at: reportCountMap[task.id]?.latest_at ?? null,
    }));

    res.json({ success: true, tasks: enrichedTasks, session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

export const getTaskHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const { id } = req.params;
    const [tasks, employees] = await Promise.all([loadTasks(), loadEmployees()]);
    const task = hydrateTasks(tasks, employees).find((item) => item.id === id);

    if (!task) {
      return res.status(404).json({ error: "Không tìm thấy task" });
    }

    res.json({ success: true, task, session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

export const createTaskHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const currentEmployee = await getCurrentEmployee(session);
    const {
      assignerId,
      assigneeId,
      topic,
      title,
      content,
      deadline,
      status = "todo",
    } = req.body as {
      assignerId?: string;
      assigneeId?: string;
      topic?: string;
      title?: string;
      content?: string;
      deadline?: string;
      status?: UiStatus;
    };

    if (!title || !assigneeId) {
      return res.status(400).json({ error: "title và assigneeId là bắt buộc" });
    }

    if (deadline && isPastDate(deadline.trim())) {
      return res.status(400).json({ error: "Deadline không được là ngày trong quá khứ" });
    }

    const employees = await loadEmployees();
    const assignee = employees.find((employee) => employee.id === assigneeId);
    const assigner = assignerId ? employees.find((employee) => employee.id === assignerId) : currentEmployee;

    if (!assignee) {
      return res.status(400).json({ error: "Assignee không hợp lệ" });
    }

    if (!assigner) {
      return res.status(400).json({ error: "Assignor không hợp lệ hoặc chưa có bản ghi employee" });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        assigner_id: assigner.id,
        assignee_id: assignee.id,
        topic: topic?.trim() || null,
        title: title.trim(),
        content: content?.trim() || null,
        deadline: deadline?.trim() || null,
        status: uiToDbStatus(status),
      })
      .select("id,assigner_id,assignee_id,topic,title,content,status,created_at,deadline")
      .single<TaskRow>();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const hydrated = hydrateTasks([data], employees)[0];

    await insertUserNotifications([
      {
        source: "employees",
        subject_id: assignee.id,
        topic: "Task",
        title: "Có task mới được giao",
        content: `${assigner.name} đã giao task: ${title.trim()}`,
        link: `/tasks/${hydrated.id}`,
      },
    ]).catch(() => null);

    return res.status(201).json({ success: true, task: hydrated });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

export const claimTaskHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const { id } = req.params;
    const employees = await loadEmployees();
    const tasks = await loadTasks();
    const currentTask = tasks.find((task) => task.id === id);

    if (!currentTask) {
      return res.status(404).json({ error: "Không tìm thấy task" });
    }

    const currentEmployee = session.source === "employees" ? employees.find((employee) => employee.id === session.sub) ?? null : null;
    const isAllowed = session.source === "admins" || currentTask.assignee_id === session.sub || currentEmployee?.role === "leader";

    if (!isAllowed) {
      return res.status(403).json({ error: "Bạn không có quyền nhận task này" });
    }

    if (currentTask.status !== "pending") {
      return res.status(409).json({ error: "Task này đã được nhận hoặc đã hoàn thành" });
    }

    const { error } = await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const refreshedTasks = await loadTasks();
    const hydrated = hydrateTasks(refreshedTasks, employees).find((task) => task.id === id);

    if (currentTask.assigner_id !== session.sub) {
      await insertUserNotifications([
        {
          source: "employees",
          subject_id: currentTask.assigner_id,
          topic: "Task",
          title: "Task đã được nhận",
          content: `${currentEmployee?.name ?? "Một thành viên"} đã nhận task: ${currentTask.title}`,
          link: `/tasks/${currentTask.id}`,
        },
      ]).catch(() => null);
    }

    return res.json({ success: true, task: hydrated });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

export const updateTaskStatusHandler = async (req: Request, res: Response) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const { id } = req.params;
    const { status } = req.body as { status?: UiStatus };

    if (!status) {
      return res.status(400).json({ error: "status là bắt buộc" });
    }

    const employees = await loadEmployees();
    const tasks = await loadTasks();
    const currentTask = tasks.find((task) => task.id === id);

    if (!currentTask) {
      return res.status(404).json({ error: "Không tìm thấy task" });
    }

    const currentEmployee = session.source === "employees" ? employees.find((employee) => employee.id === session.sub) ?? null : null;
    const isAllowed = session.source === "admins" || currentTask.assignee_id === session.sub || currentTask.assigner_id === session.sub || currentEmployee?.role === "leader";

    if (!isAllowed) {
      return res.status(403).json({ error: "Bạn không có quyền cập nhật task này" });
    }

    const { error } = await supabase
      .from("tasks")
      .update({ status: uiToDbStatus(status) })
      .eq("id", id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const refreshedTasks = await loadTasks();
    const hydrated = hydrateTasks(refreshedTasks, employees).find((task) => task.id === id);

    const recipients = new Set([currentTask.assigner_id, currentTask.assignee_id]);
    recipients.delete(session.sub);

    await insertUserNotifications(
      Array.from(recipients).map((recipientId) => ({
        source: "employees",
        subject_id: recipientId,
        topic: "Task",
        title: "Task vừa được cập nhật",
        content: `Task "${currentTask.title}" đã chuyển sang trạng thái ${status}`,
        link: `/tasks/${currentTask.id}`,
      })),
    ).catch(() => null);

    return res.json({ success: true, task: hydrated });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};