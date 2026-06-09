"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CheckSquare, Clock, MessageSquare } from "lucide-react";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  fetchChatRooms,
  formatRoomTime,
  getAvatarClass,
  getAvatarInitials,
  getAvatarSeed,
  markChatRoomRead,
  notifyChatUnreadChanged,
  type ChatRoomSummary,
} from "./chat/chat-api";

const CHAT_REFRESH_INTERVAL_MS = 5_000;

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
  todo: "未着手 / Chưa làm",
  doing: "進行中 / Đang làm",
  done: "完了 / Hoàn thành",
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
    : "新規";
  const badge2 = createdAt ? String(createdAt.getDate()) : "Mới";
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
  const messagesRequestRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = useMemo(() => readStoredUser(), []);

  useEffect(() => {
    const loadTasks = async () => {
      const token = getAuthToken();
      if (!token || !currentUser?.id) {
        setLoadingTasks(false);
        setTaskError("セッションがありません / Chưa có phiên đăng nhập.");
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
          throw new Error(payload?.error || "タスクを読み込めません / Không thể tải task");
        }

        const mapped = (payload?.tasks ?? [])
          .slice(0, 4)
          .map((task: TaskItem) => mapTaskCard(task));
        setTasks(mapped);
      } catch (error) {
        setTaskError(error instanceof Error ? error.message : "タスクを読み込めません / Không thể tải task");
      } finally {
        setLoadingTasks(false);
      }
    };

    void loadTasks();
  }, [currentUser?.id]);

  const loadMessages = useCallback(async (showLoading = true) => {
    const requestId = ++messagesRequestRef.current;
    try {
      if (showLoading) setLoadingMessages(true);
      const rooms = await fetchChatRooms();
      if (requestId !== messagesRequestRef.current) return;
      setMessageError("");
      const unreadRooms = rooms
        .filter((room) => room.unread > 0)
        .filter((room) => room.latest_at)
        .sort(
          (a, b) =>
            new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime(),
        )
        .slice(0, 4);
      setLatestMessages(unreadRooms.map(mapMessageCard));
      setUnreadCount(unreadRooms.length);
    } catch (error) {
      if (requestId !== messagesRequestRef.current) return;
      if (showLoading) {
        setMessageError(
          error instanceof Error ? error.message : "メッセージを読み込めません / Không thể tải tin nhắn",
        );
        setUnreadCount(0);
      }
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();

    const handleChatUnreadChanged = () => {
      void loadMessages();
    };

    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, handleChatUnreadChanged);
    const timer = window.setInterval(() => {
      void loadMessages(false);
    }, CHAT_REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, handleChatUnreadChanged);
      window.clearInterval(timer);
    };
  }, [loadMessages, pathname]);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoadingAnnouncements(true);
        setAnnouncementError("");
        const response = await fetch(`${API_BASE_URL}/api/posts`);
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "掲示板を読み込めません / Không thể tải bảng tin");
        }

        const mapped = (payload?.data ?? [])
          .slice(0, 4)
          .map((post: Post, index: number) => mapAnnouncementCard(post, index));
        setAnnouncements(mapped);
      } catch (error) {
        setAnnouncementError(
          error instanceof Error ? error.message : "掲示板を読み込めません / Không thể tải bảng tin",
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
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start">
                <CheckSquare className="w-5 h-5 mr-2 text-blue-600 mt-0.5" />
                <h2 className="text-base font-bold text-slate-800 leading-tight">
                  <span className="block">マイタスク</span>
                  <span className="block">Task của tôi</span>
                </h2>
              </div>
              <Link
                href="/tasks"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                <span className="block">すべて見る</span>
                <span className="block">Xem tất cả</span>
              </Link>
            </div>

            <div className="space-y-3">
              {loadingTasks ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  <span className="block">タスクを読み込み中...</span>
                  <span className="block">Đang tải task...</span>
                </div>
              ) : taskError ? (
                <div className="rounded-lg border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-500">
                  {taskError}
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  <span className="block">タスクがありません</span>
                  <span className="block">Không có task.</span>
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
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-600 mt-0.5" />
                <h2 className="text-base font-bold text-slate-800 leading-tight">
                  <span className="block">最新メッセージ</span>
                  <span className="block">Tin nhắn mới nhất</span>
                </h2>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                <span className="block">{unreadCount} 未読</span>
                <span className="block">{unreadCount} chưa đọc</span>
              </span>
            </div>

            <div className="space-y-0 divide-y divide-slate-100">
              {loadingMessages ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  <span className="block">メッセージを読み込み中...</span>
                  <span className="block">Đang tải tin nhắn...</span>
                </div>
              ) : messageError ? (
                <div className="rounded-lg border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-500">
                  {messageError}
                </div>
              ) : latestMessages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  <span className="block">メッセージがありません</span>
                  <span className="block">Không có tin nhắn.</span>
                </div>
              ) : (
                latestMessages.map((msg) => (
                  <Link
                    key={msg.id}
                    href={`/chat/${encodeURIComponent(msg.id)}`}
                    onClick={async (event) => {
                      event.preventDefault();
                      await markChatRoomRead(msg.id).catch(() => null);
                      notifyChatUnreadChanged();
                      router.push(`/chat/${encodeURIComponent(msg.id)}`);
                    }}
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
          <div className="flex items-start mb-4">
            <AlertCircle className="w-5 h-5 mr-2 text-blue-600 mt-0.5" />
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              <span className="block">最新のお知らせ</span>
              <span className="block">Thông báo / Bảng tin mới</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingAnnouncements ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 md:col-span-2">
                <span className="block">掲示板を読み込み中...</span>
                <span className="block">Đang tải bảng tin...</span>
              </div>
            ) : announcementError ? (
              <div className="rounded-lg border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-500 md:col-span-2">
                {announcementError}
              </div>
            ) : announcements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 md:col-span-2">
                <span className="block">お知らせがありません</span>
                <span className="block">Không có thông báo.</span>
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
