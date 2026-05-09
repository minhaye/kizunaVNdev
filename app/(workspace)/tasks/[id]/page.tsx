"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, CircleCheckBig, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type TaskStatus = "todo" | "doing" | "done";

type CurrentUser = {
  id: string;
  name?: string;
  email?: string;
  role?: "employee" | "leader" | "admin";
  nationality?: "vn" | "jp";
  avatar_url?: string | null;
};

type Task = {
  id: string;
  topic: string | null;
  title: string;
  content: string | null;
  created_at: string;
  deadline: string | null;
  status: TaskStatus;
  status_db: string;
  assigner_id: string;
  assignee_id: string;
  assigner_name: string;
  assignee_name: string;
  assigner_role: string | null;
  assignee_role: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const getDeadlineParts = (value: string | null) => {
  if (!value) {
    return { dateText: "-", timeText: "-" };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { dateText: value, timeText: "-" };
  }

  const dateText = parsed.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const hasTime = parsed.getHours() !== 0 || parsed.getMinutes() !== 0 || parsed.getSeconds() !== 0;
  const timeText = hasTime
    ? parsed.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "-";

  return { dateText, timeText };
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "未着手 / To do",
  doing: "進行中 / Doing",
  done: "完了 / Done",
};

const statusClass: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700",
  doing: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

const readStoredUser = (): CurrentUser | null => {
  if (typeof window === "undefined") return null;

  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as CurrentUser;
  } catch {
    return null;
  }
};

const getAuthToken = () => (typeof window === "undefined" ? null : localStorage.getItem("authToken"));

const getTaskIdFromParams = (params: Record<string, string | string[] | undefined>) => {
  const value = params.id;
  return Array.isArray(value) ? value[0] : value ?? "";
};

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = getTaskIdFromParams(params ?? {});
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    setCurrentUser(readStoredUser());
  }, []);

  useEffect(() => {
    const loadTask = async () => {
      const token = getAuthToken();
      if (!token) {
        setError("Chưa có session đăng nhập.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Không thể tải task");
        }

        setTask(data.task);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải task");
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      void loadTask();
    }
  }, [taskId]);

  const refreshTask = (nextTask: Task) => {
    setTask(nextTask);
  };

  const claimTask = async () => {
    if (!task) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      setMutating(true);
      const response = await fetch(`${API_BASE_URL}/api/tasks/${task.id}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể nhận task");
      }

      refreshTask(data.task);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Không thể nhận task");
    } finally {
      setMutating(false);
    }
  };

  const completeTask = async () => {
    if (!task) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      setMutating(true);
      const response = await fetch(`${API_BASE_URL}/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "done" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể hoàn thành task");
      }

      refreshTask(data.task);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể hoàn thành task");
    } finally {
      setMutating(false);
    }
  };

  const canClaim = task?.status === "todo" && (currentUser?.id === task.assignee_id || currentUser?.role === "admin");
  const canComplete = task?.status === "doing" && (currentUser?.id === task.assignee_id || currentUser?.role === "admin");
  const deadlineParts = getDeadlineParts(task?.deadline ?? null);

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Task detail</h2>
            <p className="text-sm text-slate-500">Xem chi tiết, nhận task và chuyển sang done.</p>
          </div>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Quay lại board
          </Link>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải task...
            </div>
          ) : task ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusClass[task.status]}`}>
                  {statusLabel[task.status]}
                </span>
                <span className="text-xs text-slate-400">Task ID: {task.id}</span>
              </div>

              <div>
                <p className="text-xs text-slate-500">Task title</p>
                <p className="font-semibold text-slate-800 text-lg">{task.title}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Giao bởi</p>
                  <p className="text-sm font-semibold text-slate-700">{task.assigner_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Nhận bởi</p>
                  <p className="text-sm font-semibold text-slate-700">{task.assignee_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Topic</p>
                  <p className="text-sm font-semibold text-slate-700">{task.topic || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Deadline</p>
                  <p className="text-sm font-semibold text-slate-700">{deadlineParts.dateText}</p>
                  <p className="text-xs text-slate-500 mt-1">Giờ: {deadlineParts.timeText}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {task.content || "Chưa có mô tả."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {canClaim && (
                  <button
                    type="button"
                    onClick={() => void claimTask()}
                    disabled={mutating}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <CircleCheckBig className="w-4 h-4" />
                    {mutating ? "Đang nhận..." : "Nhận task"}
                  </button>
                )}

                {canComplete && (
                  <button
                    type="button"
                    onClick={() => void completeTask()}
                    disabled={mutating}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {mutating ? "Đang cập nhật..." : "Hoàn thành task"}
                  </button>
                )}

                {task.status === "done" && (
                  <span className="rounded-md bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                    Task đã hoàn thành
                  </span>
                )}

                {!canClaim && !canComplete && task.status !== "done" && (
                  <span className="text-sm text-slate-500">
                    Bạn có thể xem task này nhưng không phải người nhận được gán để thao tác.
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">Không tìm thấy task.</div>
          )}
        </section>
      </div>
    </main>
  );
}
