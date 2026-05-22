"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckSquare, Clock, MessageSquare } from "lucide-react";
import {
  fetchChatRooms,
  formatRoomTime,
  getAvatarClass,
  getAvatarInitials,
  getAvatarSeed,
  type ChatRoomSummary,
} from "./chat/chat-api";

type CurrentUser = {
  id: string;
  name?: string;
  email?: string;
};

type TaskStatus = "todo" | "doing" | "done";

type TaskItem = {
  id: string;
  title: string;
  topic: string | null;
  deadline: string | null;
  status: TaskStatus;
};

type TaskCard = {
  id: string;
  status: string;
  statusClass: string;
  title: string;
  sub: string;
  due: string;
  dueClass: string;
};

type MessageCard = {
  id: string;
  user: string;
  time: string;
  text: string;
  avatar: string;
  avatarClass: string;
  online: boolean;
  unread: number;
};

type AnnouncementCard = {
  id: string;
  badge: string;
  badge2: string;
  badgeClass: string;
  title: string;
  body: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:4000";

const statusLabel: Record<TaskStatus, string> = {
  todo: "未着手 / To do",
  doing: "進行中 / Doing",
  done: "完了 / Done",
};

const statusBadgeClass: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  doing: "bg-yellow-100 text-yellow-700",
  done: "bg-emerald-100 text-emerald-700",
};

const announcementClasses = [
  "bg-red-50 text-red-600",
  "bg-emerald-50 text-emerald-600",
  "bg-blue-50 text-blue-600",
  "bg-amber-50 text-amber-600",
];

const readStoredUser = (): CurrentUser | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
};

const getAuthToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("authToken");

const formatDeadlineText = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const isOverdue = (value: string | null) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
};

const truncateText = (value: string, length: number) => {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
};

const mapTaskCard = (task: TaskItem): TaskCard => ({
  id: task.id,
  status: statusLabel[task.status],
  statusClass: statusBadgeClass[task.status],
  title: task.title,
  sub: task.topic ? `${task.topic}` : "",
  due: formatDeadlineText(task.deadline),
  dueClass: isOverdue(task.deadline) ? "text-red-500" : "text-slate-400",
});

const mapMessageCard = (room: ChatRoomSummary): MessageCard => {
  const seed = getAvatarSeed(room.name);
  return {
    id: room.id,
    user: room.name,
    time: formatRoomTime(room.latest_at),
    text: room.latest || "",
    avatar: getAvatarInitials(seed),
    avatarClass: getAvatarClass(seed),
    online: room.online,
    unread: room.unread ?? 0,
  };
};

const mapAnnouncementCard = (post: Post, index: number): AnnouncementCard => {
  const createdAt = post.created_at ? new Date(post.created_at) : null;
  const badge = createdAt
    ? `${createdAt.getMonth() + 1}月`
    : "New";
  const badge2 = createdAt ? String(createdAt.getDate()) : "Post";
  return {
    id: post.id,
    badge,
    badge2,
    badgeClass: announcementClasses[index % announcementClasses.length],
    title: post.title,
    body: truncateText(post.content ?? "", 140),
  };
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [latestMessages, setLatestMessages] = useState<MessageCard[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementCard[]>([]);
  const [taskError, setTaskError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [announcementError, setAnnouncementError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  const currentUser = useMemo(() => readStoredUser(), []);

  useEffect(() => {
    const loadTasks = async () => {
      const token = getAuthToken();
      if (!token || !currentUser?.id) {
        setLoadingTasks(false);
        setTaskError("Chưa có session đăng nhập hoặc user.");
        return;
      }

      try {
        setLoadingTasks(true);
        setTaskError("");

        const query = `?assigneeId=${encodeURIComponent(currentUser.id)}`;
        const response = await fetch(`${API_BASE_URL}/api/tasks${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Không thể tải task");
        }

        const mapped = (payload?.tasks ?? [])
          .slice(0, 4)
          .map((task: TaskItem) => mapTaskCard(task));
        setTasks(mapped);
      } catch (error) {
        setTaskError(error instanceof Error ? error.message : "Không thể tải task");
      } finally {
        setLoadingTasks(false);
      }
    };

    void loadTasks();
  }, [currentUser?.id]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        setMessageError("");
        const rooms = await fetchChatRooms();
        const sorted = rooms
          .filter((room) => room.latest_at)
          .sort(
            (a, b) =>
              new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime(),
          )
          .slice(0, 4);
        setLatestMessages(sorted.map(mapMessageCard));
        setUnreadCount(
          rooms.reduce((sum, room) => sum + (room.unread ?? 0), 0),
        );
      } catch (error) {
        setMessageError(
          error instanceof Error ? error.message : "Không thể tải tin nhắn",
        );
        setUnreadCount(0);
      } finally {
        setLoadingMessages(false);
      }
    };

    void loadMessages();
  }, []);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoadingAnnouncements(true);
        setAnnouncementError("");
        const response = await fetch(`${API_BASE_URL}/api/posts`);
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Không thể tải bảng tin");
        }

        const mapped = (payload?.data ?? [])
          .slice(0, 4)
          .map((post: Post, index: number) => mapAnnouncementCard(post, index));
        setAnnouncements(mapped);
      } catch (error) {
        setAnnouncementError(
          error instanceof Error ? error.message : "Không thể tải bảng tin",
        );
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    void loadAnnouncements();
  }, []);

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center text-slate-800">
                  <CheckSquare className="w-5 h-5 mr-2 text-blue-600" />{" "}
                  マイタスク
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  マイタスク / Task của tôi
                </p>
              </div>
              <Link
                href="/tasks"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                すべて見る (Xem tất cả)
              </Link>
            </div>

            <div className="space-y-3">
              {loadingTasks ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải task...
                </div>
              ) : taskError ? (
                <div className="rounded-lg border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-500">
                  {taskError}
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Không có task.
                </div>
              ) : (
                tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${encodeURIComponent(task.id)}`}
                    className="block"
                  >
                    <div className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded mb-1 ${task.statusClass}`}
                          >
                            {task.status}
                          </span>
                          <h3 className="text-sm font-medium text-slate-800">
                            {task.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {task.sub || "-"}
                          </p>
                        </div>
                        <div
                          className={`flex items-center text-xs font-medium ${task.dueClass}`}
                        >
                          <Clock className="w-3 h-3 mr-1" /> {task.due}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center text-slate-800">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />{" "}
                  最新メッセージ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  最新メッセージ / Tin nhắn mới nhất
                </p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {unreadCount} 未読 ({unreadCount} chưa đọc)
              </span>
            </div>

            <div className="space-y-0 divide-y divide-slate-100">
              {loadingMessages ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải tin nhắn...
                </div>
              ) : messageError ? (
                <div className="rounded-lg border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-500">
                  {messageError}
                </div>
              ) : latestMessages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Không có tin nhắn.
                </div>
              ) : (
                latestMessages.map((msg) => (
                  <Link
                    key={msg.id}
                    href={`/chat/${encodeURIComponent(msg.id)}`}
                    className="block"
                  >
                    <div className="py-3 flex items-start cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors">
                      <div
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${msg.avatarClass}`}
                      >
                        {msg.avatar}
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${msg.online ? "bg-emerald-500" : "bg-amber-400"}`}
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-bold text-slate-800">
                            {msg.user}
                          </span>
                          <span className="text-xs text-blue-600 font-medium">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 font-medium mt-0.5">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold flex items-center text-slate-800">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />{" "}
              最新のお知らせ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              最新通知 / Thông báo / Bảng tin mới
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingAnnouncements ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 md:col-span-2">
                Đang tải bảng tin...
              </div>
            ) : announcementError ? (
              <div className="rounded-lg border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-500 md:col-span-2">
                {announcementError}
              </div>
            ) : announcements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 md:col-span-2">
                Không có thông báo.
              </div>
            ) : (
              announcements.map((news) => (
                <Link
                  key={news.id}
                  href={`/board?postId=${encodeURIComponent(news.id)}`}
                  className="block"
                >
                  <div className="flex p-3 border border-slate-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div
                      className={`w-12 h-12 rounded flex flex-col items-center justify-center shrink-0 ${news.badgeClass}`}
                    >
                      <span className="text-xs font-bold">{news.badge}</span>
                      <span className="text-base font-black leading-none mt-0.5">
                        {news.badge2}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-bold text-slate-800 hover:text-blue-600">
                        {news.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {news.body}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
