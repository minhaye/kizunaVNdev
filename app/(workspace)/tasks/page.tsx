"use client";

import Link from "next/link";
import { Plus, Search, X, CheckCircle2, CircleArrowRight, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TaskStatus = "todo" | "doing" | "done";

type CurrentUser = {
  id: string;
  name?: string;
  email?: string;
  role?: "employee" | "leader" | "admin";
  nationality?: "vn" | "jp";
  avatar_url?: string | null;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: "employee" | "leader" | "admin";
  nationality: "vn" | "jp";
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
  report_count: number;
  latest_report_at: string | null;
};

type TaskDraft = {
  title: string;
  topic: string;
  content: string;
  deadline: string;
  deadlineTime: string;
  assignerId: string;
  assigneeId: string;
};

type TaskColumn = {
  title: string;
  status: TaskStatus;
  description: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const formatDeadline = (value: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const dateText = parsed.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const hasTime = parsed.getHours() !== 0 || parsed.getMinutes() !== 0 || parsed.getSeconds() !== 0;
  if (!hasTime) return dateText;

  const timeText = parsed.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${dateText} ${timeText}`;
};

const getTodayInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const columns: TaskColumn[] = [
  {
    title: "未着手 / Chưa làm",
    status: "todo",
    description: "タスクは割り当て済みですが未着手 / Task đã giao nhưng chưa nhận",
  },
  {
    title: "進行中 / Đang làm",
    status: "doing",
    description: "進行中のタスク / Task đang được xử lý",
  },
  {
    title: "完了 / Hoàn thành",
    status: "done",
    description: "完了済みタスク / Task đã hoàn thành",
  },
];

const emptyDraft = (userId = "", assigneeId = ""): TaskDraft => ({
  title: "",
  topic: "",
  content: "",
  deadline: "",
  deadlineTime: "",
  assignerId: userId,
  assigneeId,
});

const statusBadgeClass: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700",
  doing: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "未着手 / Chưa làm",
  doing: "進行中 / Đang làm",
  done: "完了 / Hoàn thành",
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

const mapTask = (task: Task): Task => task;

export default function TaskBoardPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft());
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [taskPages, setTaskPages] = useState<Record<string, number>>({ todo: 1, doing: 1, done: 1 });
  const taskPageSize = 5;
  const todayInputValue = useMemo(() => getTodayInputValue(), []);

  const currentUserName = currentUser?.name ?? currentUser?.email?.split("@")[0] ?? "ユーザー";
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    const storedUser = readStoredUser();
    setCurrentUser(storedUser);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setDraft((prev) => ({
      ...prev,
      assignerId: prev.assignerId || currentUser.id,
    }));
  }, [currentUser]);

  useEffect(() => {
    const loadData = async () => {
      const token = getAuthToken();
      if (!token) {
        setError("セッションがありません / Chưa có phiên đăng nhập. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [tasksResponse, employeesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/employees`),
        ]);

        const tasksData = await tasksResponse.json();
        const employeesData = await employeesResponse.json();

        if (!tasksResponse.ok) {
          throw new Error(tasksData.error || "タスクを読み込めません / Không thể tải task");
        }

        if (!employeesResponse.ok) {
          throw new Error(employeesData.error || "社員一覧を読み込めません / Không thể tải danh sách nhân sự");
        }

        setTasks((tasksData.tasks ?? []).map(mapTask));
        setEmployees(employeesData.employees ?? []);

        const firstEmployeeId = employeesData.employees?.[0]?.id ?? "";
        setDraft((prev) => ({
          ...prev,
          assignerId: currentUser?.role === "admin" ? prev.assignerId || firstEmployeeId : prev.assignerId || currentUser?.id || "",
          assigneeId: prev.assigneeId || firstEmployeeId,
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "タスク読み込みエラー / Có lỗi xảy ra khi tải task");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [currentUser]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => statusFilter === "all" || task.status === statusFilter)
      .filter((task) => {
        if (normalizedQuery.length === 0) return true;
        return [
          task.title,
          task.topic ?? "",
          task.content ?? "",
          task.assigner_name,
          task.assignee_name,
          task.deadline ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      });
  }, [tasks, statusFilter, normalizedQuery]);

  const groupedTasks = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      cards: visibleTasks.filter((task) => task.status === column.status),
    }));
  }, [visibleTasks]);

  const totalVisibleTasks = visibleTasks.length;

  const refreshTask = (updatedTask: Task) => {
    setTasks((currentTasks) =>
      currentTasks.some((task) => task.id === updatedTask.id)
        ? currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        : [updatedTask, ...currentTasks],
    );
  };

  const claimTask = async (taskId: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setMutatingId(taskId);
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "タスクを受け取れません / Không thể nhận task");
      }

      refreshTask(data.task);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "タスクを受け取れません / Không thể nhận task");
    } finally {
      setMutatingId(null);
    }
  };

  const completeTask = async (taskId: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setMutatingId(taskId);
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "done" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "タスクを更新できません / Không thể cập nhật task");
      }

      refreshTask(data.task);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "タスクを更新できません / Không thể cập nhật task");
    } finally {
      setMutatingId(null);
    }
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setDraft(
      emptyDraft(
        currentUser?.role === "admin" ? draft.assignerId : currentUser?.id ?? "",
        draft.assigneeId,
      ),
    );
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    if (draft.deadline && draft.deadline < todayInputValue) {
      setError("締切日は過去にできません / Deadline không được là ngày trong quá khứ");
      return;
    }

    if (draft.deadline && draft.deadlineTime && draft.deadline === todayInputValue) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (draft.deadlineTime <= currentTime) {
        setError("締切時刻は過去にできません / Deadline không được là thời gian trong quá khứ");
        return;
      }
    }

    const deadlineValue = draft.deadline
      ? draft.deadlineTime
        ? `${draft.deadline}T${draft.deadlineTime}:00`
        : draft.deadline
      : "";

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignerId: draft.assignerId || currentUser?.id,
          assigneeId: draft.assigneeId,
          topic: draft.topic,
          title: draft.title,
          content: draft.content,
          deadline: deadlineValue,
          status: "todo",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "タスクを作成できません / Không thể tạo task");
      }

      refreshTask(data.task);
      closeCreateModal();
      setError("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "タスクを作成できません / Không thể tạo task");
    }
  };

  const assigneeOptions = employees.length > 0 ? employees : [];

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              <span className="block">タスクボード</span>
              <span className="block">Bảng công việc</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextAssignee = employees[0]?.id ?? currentUser?.id ?? "";
              setDraft({
                title: "",
                topic: "",
                content: "",
                deadline: "",
                deadlineTime: "",
                assignerId: currentUser?.role === "admin" ? nextAssignee : currentUser?.id ?? "",
                assigneeId: nextAssignee,
              });
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="leading-tight">
              <span className="block">タスク作成</span>
              <span className="block">Tạo task</span>
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-60 flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="w-full text-sm outline-none"
                placeholder="タスク・トピック・依頼者・担当者で検索... / Tìm task, topic, người giao, người nhận..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "all")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">すべて / Tất cả</option>
            <option value="todo">未着手 / Chưa làm</option>
            <option value="doing">進行中 / Đang làm</option>
            <option value="done">完了 / Hoàn thành</option>
          </select>
          <span className="text-xs text-slate-400">
            <span className="block">{totalVisibleTasks} タスク</span>
            <span className="block">{totalVisibleTasks} tác vụ</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {groupedTasks.map((column) => {
            const currentPage = taskPages[column.status] ?? 1;
            const totalColPages = Math.max(1, Math.ceil(column.cards.length / taskPageSize));
            const paginatedCards = column.cards.slice((currentPage - 1) * taskPageSize, currentPage * taskPageSize);

            return (
            <section key={column.title} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-full">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">{column.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    <span className="block">{column.description.split(" / ")[0]}</span>
                    <span className="block">{column.description.split(" / ")[1] ?? ""}</span>
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass[column.status]}`}>
                  {column.cards.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {column.cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                    <span className="block">該当するタスクがありません。</span>
                    <span className="block">Chưa có task phù hợp.</span>
                  </div>
                ) : (
                  paginatedCards.map((task) => {
                    const isAssignee = currentUser?.id === task.assignee_id;
                    const canClaim = task.status === "todo" && (isAssignee || currentUser?.role === "admin");
                    const canComplete = task.status === "doing" && (isAssignee || currentUser?.role === "admin");

                    return (
                      <article key={task.id} className="rounded-lg border border-slate-100 p-3 hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{task.title}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              <span className="block">トピック</span>
                              <span className="block">Topic: {task.topic || "-"}</span>
                            </p>
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${statusBadgeClass[task.status]}`}>
                            {statusLabel[task.status]}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                          <span className="block">依頼者</span>
                          <span className="block">Giao bởi: {task.assigner_name}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className="block">担当者</span>
                          <span className="block">Nhận bởi: {task.assignee_name}</span>
                        </p>
                        {task.deadline && (
                          <p className="text-xs text-slate-500 mt-1">
                            <span className="block">期限</span>
                            <span className="block">Deadline: {formatDeadline(task.deadline)}</span>
                          </p>
                        )}
                        {task.content && (
                          <p className="text-[11px] text-slate-600 mt-2 rounded-md bg-slate-50 px-2 py-1 border border-slate-200 line-clamp-3">
                            {task.content}
                          </p>
                        )}

                        {/* HoRenSo indicator */}
                        {(task.status === "doing" || task.status === "done") && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-100 px-2 py-1">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[11px] font-medium text-indigo-700">
                              <span className="block">報連相</span>
                              <span className="block">
                                HoRenSo: {task.report_count > 0 ? `${task.report_count} 件 / báo cáo` : "未報告 / Chưa có"}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <span className="block">詳細を見る</span>
                            <span className="block">Xem chi tiết</span>
                          </Link>

                          {canClaim && (
                            <button
                              type="button"
                              onClick={() => void claimTask(task.id)}
                              disabled={mutatingId === task.id}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {mutatingId === task.id ? (
                                <span className="block">受信中... / Đang nhận...</span>
                              ) : (
                                <span className="leading-tight">
                                  <span className="block">タスクを引き受ける</span>
                                  <span className="block">Nhận task</span>
                                </span>
                              )}
                            </button>
                          )}

                          {canComplete && (
                            <button
                              type="button"
                              onClick={() => void completeTask(task.id)}
                              disabled={mutatingId === task.id}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {mutatingId === task.id ? "更新中... / Đang cập nhật..." : "完了にする / Hoàn thành"}
                            </button>
                          )}

                          {task.status === "done" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              <CircleArrowRight className="w-3.5 h-3.5" />
                              完了 / Done
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {totalColPages > 1 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 mt-3 border-t border-slate-100">
                  <span>ページ {currentPage} / {totalColPages} (Trang)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setTaskPages((prev) => ({ ...prev, [column.status]: Math.max(1, currentPage - 1) }))}
                      disabled={currentPage <= 1}
                    >
                      前へ / Trước
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setTaskPages((prev) => ({ ...prev, [column.status]: Math.min(totalColPages, currentPage + 1) }))}
                      disabled={currentPage >= totalColPages}
                    >
                      次へ / Sau
                    </button>
                  </div>
                </div>
              )}
            </section>
          )})}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 px-4 grid place-items-center" onClick={closeCreateModal}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">新規タスク作成 / Tạo task mới</h3>
              <button
                type="button"
                onClick={closeCreateModal}
                aria-label="Close"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form className="px-5 py-4 space-y-4" onSubmit={(event) => void handleCreateSubmit(event)}>
              <div>
                <label className="text-xs font-semibold text-slate-600">タスク名 / Task title</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="タイトルを入力 / Tiêu đề task"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">トピック / Topic</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="例: Frontend, API, Bug... / VD: Frontend, API, Bug..."
                    value={draft.topic}
                    onChange={(event) => setDraft((prev) => ({ ...prev, topic: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">期限 / Deadline</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    type="date"
                    min={todayInputValue}
                    value={draft.deadline}
                    onChange={(event) => setDraft((prev) => ({ ...prev, deadline: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">時刻 / Time</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    type="time"
                    value={draft.deadlineTime}
                    onChange={(event) => setDraft((prev) => ({ ...prev, deadlineTime: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">依頼者 / Assignor</label>
                  {currentUser?.role === "admin" ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={draft.assignerId}
                      onChange={(event) => setDraft((prev) => ({ ...prev, assignerId: event.target.value }))}
                    >
                      {assigneeOptions.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50"
                      value={currentUserName}
                      disabled
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">担当者 / Assignee</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={draft.assigneeId}
                    onChange={(event) => setDraft((prev) => ({ ...prev, assigneeId: event.target.value }))}
                    required
                  >
                    <option value="">担当者を選択 / Chọn người nhận task</option>
                    {assigneeOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">説明 / Description</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={4}
                  placeholder="タスクの説明 / Mô tả task"
                  value={draft.content}
                  onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  キャンセル / Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  タスクを作成 / Tạo task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
