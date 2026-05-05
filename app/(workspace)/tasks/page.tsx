"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { useState, type FormEvent, type MouseEvent } from "react";

type TaskCard = {
  id: string;
  title: string;
  owner: string;
  due: string;
  horensou?: string;
};

type TaskStatus = "todo" | "doing" | "done";

type TaskColumn = {
  title: string;
  status: TaskStatus;
  cards: TaskCard[];
};

type TaskDraft = {
  title: string;
  owner: string;
  due: string;
  status: TaskStatus;
  description: string;
};

const columns: TaskColumn[] = [
  {
    title: "未着手 / To do",
    status: "todo",
    cards: [
      {
        id: "spec-review",
        title: "要件定義書のレビュー",
        owner: "Tanaka",
        due: "今日 / Hôm nay",
      },
      {
        id: "weekly-report",
        title: "週次レポートの作成",
        owner: "Nam",
        due: "明日 / Ngày mai",
      },
      {
        id: "bug-triage",
        title: "不具合チケットの整理",
        owner: "Hoa",
        due: "水曜 / Thứ 4",
      },
      {
        id: "mail-draft",
        title: "顧客向けメール下書き",
        owner: "Kaito",
        due: "木曜 / Thứ 5",
      },
      {
        id: "wiki-update",
        title: "Wiki用語集の更新",
        owner: "Linh",
        due: "金曜 / Thứ 6",
      },
    ],
  },
  {
    title: "進行中 / Doing",
    status: "doing",
    cards: [
      {
        id: "api-test",
        title: "API結合テスト",
        owner: "Hoa",
        due: "今日 / Hôm nay",
        horensou: "報告: API test 70% / 連絡: test env ổn định",
      },
      {
        id: "ui-polish",
        title: "Dashboard UI微調整",
        owner: "Minh",
        due: "明日 / Ngày mai",
        horensou: "相談: icon color consistency với design system",
      },
      {
        id: "log-audit",
        title: "翻訳ログ監査",
        owner: "Nam",
        due: "木曜 / Thứ 5",
        horensou: "報告: đã rà soát 40 bản ghi",
      },
      {
        id: "task-template",
        title: "Task template標準化 / Chuẩn hóa Task template",
        owner: "Tanaka",
        due: "木曜 / Thứ 5",
        horensou: "連絡: gửi bản nháp cho team review 15:00",
      },
    ],
  },
  {
    title: "完了 / Done",
    status: "done",
    cards: [
      {
        id: "db-migration",
        title: "DB移行スクリプト",
        owner: "Minh",
        due: "完了 / Done",
        horensou: "完了報告: migration thành công, không lỗi",
      },
      {
        id: "chat-history",
        title: "履歴検索UI実装",
        owner: "Khanh",
        due: "完了 / Done",
        horensou: "完了報告: search response < 300ms",
      },
      {
        id: "permission-map",
        title: "権限マッピング整理",
        owner: "Huy",
        due: "完了 / Done",
        horensou: "連絡: tài liệu phân quyền đã bàn giao",
      },
      {
        id: "board-news",
        title: "掲示板新着表示",
        owner: "Linh",
        due: "完了 / Done",
        horensou: "完了報告: deploy lên staging lúc 17:10",
      },
    ],
  },
];

const currentUserName = "Tanaka K.";

const emptyDraft: TaskDraft = {
  title: "",
  owner: currentUserName,
  due: "",
  status: "todo",
  description: "",
};

export default function TaskBoardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [confirmTask, setConfirmTask] = useState<TaskCard | null>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const visibleColumns = columns
    .filter((col) => statusFilter === "all" || col.status === statusFilter)
    .map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        if (normalizedQuery.length === 0) return true;
        return [card.title, card.owner, card.due, card.horensou ?? ""].some(
          (value) => value.toLowerCase().includes(normalizedQuery),
        );
      }),
    }));

  const totalVisibleTasks = visibleColumns.reduce(
    (sum, col) => sum + col.cards.length,
    0,
  );

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setDraft(emptyDraft);
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    closeCreateModal();
  };

  const handleUpdateClick = (
    event: MouseEvent<HTMLButtonElement>,
    card: TaskCard,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(`/tasks/${card.id}`);
  };

  const handleDoneClick = (
    event: MouseEvent<HTMLButtonElement>,
    card: TaskCard,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setConfirmTask(card);
  };

  const closeConfirmModal = () => setConfirmTask(null);

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              タスクボード（一覧）画面
            </h2>
            <p className="text-sm text-slate-500">
              タスク一覧（カンバン） / Màn hình DS Task (Kanban)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> タスク作成 / Tạo task
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-60 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              className="w-full text-sm outline-none"
              placeholder="タスク名・担当・期限を検索 / Tìm theo task, owner, due..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as TaskStatus | "all")
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">すべて / Tất cả</option>
            <option value="todo">未着手 / To do</option>
            <option value="doing">進行中 / Doing</option>
            <option value="done">完了 / Done</option>
          </select>
          <span className="text-xs text-slate-400">
            {totalVisibleTasks} tasks
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {visibleColumns.map((col) => (
            <section
              key={col.title}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-700 mb-3">
                {col.title}
              </h3>
              <div className="space-y-3">
                {col.cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                    該当するタスクがありません / Chưa có task phù hợp.
                  </div>
                ) : (
                  col.cards.map((card) => (
                    <Link
                      key={card.id}
                      href={`/tasks/${card.id}`}
                      className="block rounded-lg border border-slate-100 p-3 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {card.title}
                        </p>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {card.due}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Owner: {card.owner}
                      </p>
                      {(col.status === "doing" || col.status === "done") &&
                        card.horensou && (
                          <p className="text-[11px] text-slate-600 mt-1 rounded-md bg-slate-50 px-2 py-1 border border-slate-200">
                            Hō-Ren-Sō: {card.horensou}
                          </p>
                        )}
                      <div className="mt-2">
                        {col.status === "todo" && (
                          <button
                            type="button"
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                          >
                            詳細を見る / Xem chi tiết
                          </button>
                        )}
                        {col.status === "doing" && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => handleUpdateClick(event, card)}
                              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              更新 / Cập nhật
                            </button>
                            <button
                              type="button"
                              onClick={(event) => handleDoneClick(event, card)}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                            >
                              完了にする / Xong task
                            </button>
                          </div>
                        )}
                        {col.status === "done" && (
                          <span className="rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            完了 / Hoàn thành
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 px-4 grid place-items-center"
          onClick={closeCreateModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">
                タスク作成 / Tạo task
              </h3>
              <button
                type="button"
                onClick={closeCreateModal}
                aria-label="Close"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form className="px-5 py-4 space-y-4" onSubmit={handleCreateSubmit}>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Task title
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="タイトルを入力 / Nhập tiêu đề"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Owner
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={"Tanaka K."}
                    disabled
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    自分の名前で作成 / Tạo với tên của bạn
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Due
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="期限 / Due date"
                    value={draft.due}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        due: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      status: event.target.value as TaskStatus,
                    }))
                  }
                >
                  <option value="todo">未着手 / To do</option>
                  <option value="doing">進行中 / Doing</option>
                  <option value="done">完了 / Done</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Description
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="内容を入力 / Mô tả ngắn"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  キャンセル / Huy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  作成 / Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmTask && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 px-4 grid place-items-center"
          onClick={closeConfirmModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">
                完了確認 / Xac nhan hoan thanh
              </h3>
              <button
                type="button"
                onClick={closeConfirmModal}
                aria-label="Close"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">{confirmTask.title}</p>
              <p className="mt-1">
                このタスクを完了にしますか？ / Ban co chac muon hoan thanh task nay?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                キャンセル / Huy
              </button>
              <button
                type="button"
                onClick={closeConfirmModal}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                完了にする / Xong task
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
