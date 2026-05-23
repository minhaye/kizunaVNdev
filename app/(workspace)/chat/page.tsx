"use client";

import Link from "next/link";
import { MessageCircleHeart, Plus, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createChatRoom,
  fetchEmployees,
  fetchChatRooms,
  formatRoomTime,
  getAvatarClass,
  getAvatarInitials,
  getAvatarSeed,
  getStoredEmployeeId,
  type EmployeeSummary,
  type ChatRoomSummary,
} from "./chat-api";

type ChatFilter = "all" | "unread" | "pinned" | "online";

export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createType, setCreateType] = useState<"direct" | "group">("direct");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupTopic, setGroupTopic] = useState("");
  const router = useRouter();
  const actorEmployeeId = useMemo(() => getStoredEmployeeId(), []);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchChatRooms();
      setRooms(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "チャット一覧を読み込めません / Không thể tải danh sách chat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const loadEmployees = useCallback(async () => {
    if (employees.length > 0) return;
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (loadError) {
      setCreateError(loadError instanceof Error ? loadError.message : "Failed to load employees");
    }
  }, [employees.length]);

  useEffect(() => {
    if (!createOpen) return;

    setCreateError("");
    void loadEmployees();
  }, [createOpen, loadEmployees]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredChats = useMemo(() => rooms.filter((chat) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [chat.name, chat.latest, chat.topic].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    const matchesFilter =
      filter === "all" ||
      (filter === "unread"
        ? chat.unread > 0
        : filter === "pinned"
          ? chat.pinned
          : chat.online);
    return matchesQuery && matchesFilter;
  }), [rooms, normalizedQuery, filter]);
  const pinnedRooms = filteredChats.filter((room) => room.pinned);
  const allUnread = rooms.reduce((sum, room) => sum + (room.unread > 0 ? 1 : 0), 0);
  const availableEmployees = employees.filter((employee) => employee.id !== actorEmployeeId);

  const markRoomRead = (roomId: string) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? { ...room, unread: 0, unread_messages: 0 }
          : room,
      ),
    );
  };

  const resetCreateForm = () => {
    setCreateType("direct");
    setSelectedMembers([]);
    setGroupName("");
    setGroupTopic("");
    setCreateError("");
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
  };

  const handleToggleMember = (employeeId: string) => {
    setSelectedMembers((prev) => {
      if (createType === "direct") {
        return [employeeId];
      }
      return prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];
    });
  };

  const handleCreateRoom = async () => {
    if (!actorEmployeeId) {
      setCreateError("Bạn cần đăng nhập để tạo phòng chat.");
      return;
    }

    if (createType === "direct" && selectedMembers.length !== 1) {
      setCreateError("Chọn đúng 1 người để tạo chat cá nhân.");
      return;
    }

    if (createType === "group" && selectedMembers.length === 0) {
      setCreateError("Chọn ít nhất 1 thành viên để tạo nhóm.");
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError("");
      const result = await createChatRoom({
        room_type: createType,
        member_ids: selectedMembers,
        name: createType === "group" ? groupName.trim() : undefined,
        topic: createType === "group" ? groupTopic.trim() : undefined,
      });
      handleCloseCreate();
      await loadRooms();
      router.push(`/chat/${result.data.id}`);
    } catch (createError) {
      setCreateError(createError instanceof Error ? createError.message : "Failed to create chat room");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MessageCircleHeart className="w-6 h-6 text-blue-600" /> KizunaVN
              Chat Hub
            </h2>
            <p className="text-sm text-slate-500">
              <span className="block">社内コミュニケーション画面</span>
              <span className="block">Khu vực trò chuyện nội bộ của KizunaVN.</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span className="leading-tight">
                <span className="block">新規チャット</span>
                <span className="block">Tạo chat</span>
              </span>
            </button>
            <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              <span className="block">{allUnread} 未読チャット</span>
              <span className="block">{allUnread} đoạn chat chưa đọc</span>
            </div>
          </div>
        </div>

        <div className="max-w-3xl">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col min-h-160">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="w-full text-sm outline-none bg-transparent"
                placeholder="チャットルーム・メンバー・ハッシュタグを検索 / Tìm phòng chat, thành viên, hashtag..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(
                [
                  { value: "all", label: "すべて / Tất cả" },
                  { value: "unread", label: "未読 / Chưa đọc" },
                  { value: "pinned", label: "固定 / Pinned" },
                  { value: "online", label: "オンライン / Online" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={
                    filter === option.value
                      ? "rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                      : "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  }
                >
                  {option.label}
                </button>
              ))}
              <span className="text-xs text-slate-400">
                {filteredChats.length} 件 / phòng
              </span>
            </div>

              {loading ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải dữ liệu chat...
                </div>
              ) : error ? (
                <div className="rounded-xl border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-500">
                  {error}
                </div>
              ) : null}

              {!loading && !error && pinnedRooms.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  固定 / Pinned
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {pinnedRooms.map((room) => (
                    <Link
                      key={room.id}
                      href={`/chat/${room.id}`}
                      className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 bg-white hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-700">
                        {room.name}
                      </p>
                      <p className="text-[11px] text-blue-600">{room.topic}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-auto pr-1 space-y-2">
              {!loading && !error && filteredChats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  該当するチャットがありません / Không tìm thấy phòng chat phù
                  hợp.
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    onClick={() => markRoomRead(chat.id)}
                    className="group flex items-center justify-between rounded-xl border border-transparent px-3 py-3 hover:bg-blue-50/70 hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarClass(getAvatarSeed(chat.name))}`}
                      >
                        {getAvatarInitials(chat.name)}
                        {chat.online && (
                          <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {chat.name}
                          </p>
                          {chat.unread_messages > 0 && (
                            <span className="text-[10px] rounded-full bg-blue-600 text-white px-1.5 py-0.5 font-bold">
                              新着 / Mới
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {chat.latest}
                        </p>
                        <p className="text-[11px] text-blue-500 mt-0.5">
                          {chat.topic}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <div className="text-[11px] text-slate-400">
                        {formatRoomTime(chat.latest_at)}
                      </div>
                      {chat.unread_messages > 0 ? (
                        <div className="mt-1 inline-flex rounded-full bg-red-100 text-red-600 text-[11px] px-2 py-0.5 font-semibold">
                          {chat.unread_messages}
                        </div>
                      ) : (
                        <Users className="w-4 h-4 text-slate-300 mt-1 ml-auto group-hover:text-blue-500" />
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className="block">チャット作成</span>
                  <span className="block">Tạo phòng chat</span>
                </p>
                <p className="text-xs text-slate-500">
                  <span className="block">個人・グループを選択</span>
                  <span className="block">Chọn chat cá nhân hoặc chat nhóm</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreate}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close create chat dialog"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="flex items-center gap-2">
                {([
                  { value: "direct", label: "個人チャット" },
                  { value: "group", label: "グループチャット" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setCreateType(option.value);
                      setSelectedMembers([]);
                    }}
                    className={
                      createType === option.value
                        ? "rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                        : "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    }
                  >
                    <span className="block">{option.label}</span>
                    <span className="block text-xs text-slate-300">{option.value === "direct" ? "Chat cá nhân" : "Chat nhóm"}</span>
                  </button>
                ))}
              </div>

              {createType === "group" && (
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-slate-600">
                    <span className="block">グループ名</span>
                    <span className="block">Tên nhóm</span>
                  </label>
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="例: チームチャット / VD: Team chat"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                  />
                  <label className="text-xs font-medium text-slate-600">
                    <span className="block">トピック</span>
                    <span className="block">Chủ đề</span>
                  </label>
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="例: Q2プロジェクト / VD: Dự án Q2"
                    value={groupTopic}
                    onChange={(event) => setGroupTopic(event.target.value)}
                  />
                </div>
              )}

              <div className="rounded-xl border border-slate-200 p-3 max-h-64 overflow-auto">
                {availableEmployees.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    <span className="block">該当するメンバーがありません</span>
                    <span className="block">Không có nhân viên nào.</span>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableEmployees.map((employee) => {
                      const isSelected = selectedMembers.includes(employee.id);
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => handleToggleMember(employee.id)}
                          className={
                            isSelected
                              ? "w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left"
                              : "w-full rounded-xl border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarClass(getAvatarSeed(employee.name))}`}
                            >
                              {getAvatarInitials(employee.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-700 truncate">
                                {employee.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {createError && (
                <div className="rounded-xl border border-dashed border-red-200 px-3 py-2 text-xs text-red-500">
                  {createError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-4">
              <button
                type="button"
                onClick={handleCloseCreate}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                <span className="block">キャンセル</span>
                <span className="block">Hủy</span>
              </button>
              <button
                type="button"
                onClick={() => void handleCreateRoom()}
                disabled={createLoading}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {createLoading ? (
                  <span className="block">作成中... / Đang tạo...</span>
                ) : (
                  <span className="leading-tight">
                    <span className="block">作成</span>
                    <span className="block">Tạo phòng</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
