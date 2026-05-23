"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  MessageSquare,
  CheckSquare,
  BookOpen,
  ClipboardList,
  Settings,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Avatar from "./avatar";
import { fetchChatRooms } from "../(workspace)/chat/chat-api";

type MenuItem = {
  href: string;
  ja: string;
  vi: string;
  icon: ReactNode;
  matcher: (pathname: string) => boolean;
};

const menuItems: MenuItem[] = [
  {
    href: "/",
    ja: "ダッシュボード",
    vi: "Trang chủ",
    icon: <LayoutDashboard className="w-5 h-5 mr-3" />,
    matcher: (pathname) => pathname === "/",
  },
  {
    href: "/chat",
    ja: "チャット",
    vi: "Trò chuyện",
    icon: <MessageSquare className="w-5 h-5 mr-3" />,
    matcher: (pathname) => pathname.startsWith("/chat"),
  },
  {
    href: "/tasks",
    ja: "タスクボード",
    vi: "Quản lý Task",
    icon: <CheckSquare className="w-5 h-5 mr-3" />,
    matcher: (pathname) => pathname.startsWith("/tasks"),
  },
  {
    href: "/wiki",
    ja: "文化Wiki",
    vi: "Wiki Văn hóa",
    icon: <BookOpen className="w-5 h-5 mr-3" />,
    matcher: (pathname) => pathname.startsWith("/wiki"),
  },
  {
    href: "/board",
    ja: "掲示板",
    vi: "Bảng tin",
    icon: <ClipboardList className="w-5 h-5 mr-3" />,
    matcher: (pathname) => pathname.startsWith("/board"),
  },
  {
    href: "/profile",
    ja: "プロフィール",
    vi: "Trang cá nhân",
    icon: <User className="w-5 h-5 mr-3" />,
    matcher: (pathname) => pathname.startsWith("/profile"),
  },
];

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE ??
    "http://localhost:4000";
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Tanaka K.");
  const [displayRole, setDisplayRole] = useState("日本人スタッフ");
  const [avatarSeed, setAvatarSeed] = useState("Tanaka");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; created_at: string; topic: string; title: string; content: string }[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const applyUser = (user: {
    name?: string;
    role?: string;
    nationality?: string;
    email?: string;
    avatar_url?: string | null;
  }) => {
    const nextName = user.name || user.email?.split("@")[0] || "Người dùng";
    setDisplayName(nextName);
    setAvatarSeed(nextName);
    setAvatarUrl(user.avatar_url ?? null);

    if (user.role === "admin") {
      setDisplayRole("管理者 / Quản trị viên");
    } else if (user.nationality === "jp") {
      setDisplayRole("日本人スタッフ / Nhân viên Nhật");
    } else if (user.nationality === "vn") {
      setDisplayRole("日越スタッフ / Nhân viên Nhật - Việt");
    } else {
      setDisplayRole("スタッフ / Nhân viên");
    }
  };

  const loadChatUnread = useCallback(async () => {
    try {
      const rooms = await fetchChatRooms();
      const unreadRooms = rooms.reduce((sum, room) => sum + (room.unread > 0 ? 1 : 0), 0);
      setChatUnreadCount(unreadRooms);
    } catch {
      setChatUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const rawUser = localStorage.getItem("user");
    const token = localStorage.getItem("authToken");

    if (rawUser) {
      try {
        const user = JSON.parse(rawUser) as {
          name?: string;
          role?: string;
          nationality?: string;
          email?: string;
          avatar_url?: string | null;
        };
        applyUser(user);
      } catch {
        // Ignore invalid localStorage data.
      }
    }

    const refreshUser = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data?.user) return;
        if (!active) return;
        applyUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch {
        // Ignore refresh errors.
      }
    };

    void refreshUser();

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/notifications`);
        const data = await res.json() as { notifications?: { id: string; created_at: string; topic: string; title: string; content: string }[] };
        if (!active) return;
        const list = data.notifications ?? [];
        setNotifications(list);
        setNotifCount(list.length);
      } catch {
        // Keep default 0 on error.
      }
    };

    void fetchNotifications();

    void loadChatUnread();
    const interval = window.setInterval(() => {
      if (!active) return;
      void loadChatUnread();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [API_BASE_URL, loadChatUnread]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const topicRoute: Record<string, string> = {
    Task: "/tasks",
    Chat: "/chat",
    News: "/board",
  };

  const handleNotifClick = (topic: string) => {
    setIsNotifOpen(false);
    const route = topicRoute[topic];
    if (route) router.push(route);
  };

  const greetingName = displayName.endsWith("さん") ? displayName : `${displayName}さん`;
  const friendlyName = displayName.includes(" ") ? displayName : displayName;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xl">K</span>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-wide">
            KizunaVN
          </span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = item.matcher(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex items-center px-3 py-2.5 bg-blue-50 text-blue-700 rounded-lg group font-medium"
                    : "flex items-center px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg group transition-colors"
                }
              >
                <span
                  className={
                    isActive
                      ? "text-blue-600"
                      : "text-slate-400 group-hover:text-blue-600"
                  }
                >
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div className="text-sm">{item.ja}</div>
                  <div
                    className={
                      isActive
                        ? "text-sm text-blue-500 font-normal"
                        : "text-sm text-slate-400 font-normal"
                    }
                  >
                    {item.vi}
                  </div>
                </div>
                {item.href === "/chat" && chatUnreadCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-[11px] font-semibold text-red-600">
                    {chatUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <Link
            href="/admin"
            className="flex items-center px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg group transition-colors"
          >
            <Settings className="w-5 h-5 mr-3 text-slate-400 group-hover:text-slate-600" />
            <div>
              <div className="text-sm">設定</div>
              <div className="text-sm text-slate-400 font-normal">Cài đặt</div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              こんにちは、{greetingName}！
            </h1>
            <p className="text-sm text-slate-500">
              <span className="block">Xin chào, {friendlyName}! Chúc một ngày làm việc hiệu quả.</span>
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
              >
                <Bell className="w-6 h-6" />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      <span className="block">通知</span>
                      <span className="block">Thông báo</span>
                    </span>
                    <span className="text-sm text-slate-400">
                      <span className="block">{notifCount} 新着</span>
                      <span className="block">{notifCount} mới</span>
                    </span>
                  </div>
                  <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-slate-400">
                        <span className="block">通知はありません</span>
                        <span className="block">Không có thông báo</span>
                      </li>
                    ) : (
                      notifications.map((n) => (
                        <li
                          key={n.id}
                          onClick={() => handleNotifClick(n.topic)}
                          className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                              {n.topic}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(n.created_at).toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 p-1 pr-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Avatar
                  name={avatarSeed}
                  src={avatarUrl}
                  className="w-8 h-8"
                />
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium leading-tight">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {displayRole}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1">
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4 mr-2" />
                    <span className="leading-tight">
                      <span className="block">プロフィール</span>
                      <span className="block">Hồ sơ</span>
                    </span>
                  </Link>
                  <hr className="my-1 border-slate-100" />
                  <Link
                    href="/login"
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className="leading-tight">
                      <span className="block">ログアウト</span>
                      <span className="block">Đăng xuất</span>
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
