"use client";

import Link from "next/link";
import { MessageCircleHeart, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchChatRooms,
  formatRoomTime,
  getAvatarClass,
  getAvatarInitials,
  getAvatarSeed,
  type ChatRoomSummary,
} from "./chat-api";

type ChatFilter = "all" | "unread" | "pinned" | "online";

export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadRooms = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchChatRooms();
        if (!active) return;
        setRooms(data);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load chat rooms");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRooms();

    return () => {
      active = false;
    };
  }, []);

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
  const allUnread = rooms.reduce((sum, room) => sum + room.unread, 0);

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
              社内コミュニケーション画面 / Khu vực trò chuyện nội bộ của
              KizunaVN.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            {allUnread} 未読メッセージ / tin chưa đọc
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
                {filteredChats.length} rooms
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
                          {chat.unread > 0 && (
                            <span className="text-[10px] rounded-full bg-blue-600 text-white px-1.5 py-0.5 font-bold">
                              新着 / new
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
                      {chat.unread > 0 ? (
                        <div className="mt-1 inline-flex rounded-full bg-red-100 text-red-600 text-[11px] px-2 py-0.5 font-semibold">
                          {chat.unread}
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
    </main>
  );
}
