"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useState, type ReactNode } from "react";

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
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
                <div>
                  <div className="text-sm">{item.ja}</div>
                  <div
                    className={
                      isActive
                        ? "text-xs text-blue-500 font-normal"
                        : "text-xs text-slate-400 font-normal"
                    }
                  >
                    {item.vi}
                  </div>
                </div>
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
              <div className="text-xs text-slate-400 font-normal">Cài đặt</div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              こんにちは、Tanakaさん！
            </h1>
            <p className="text-xs text-slate-500">
              Xin chào, anh Tanaka! Chúc một ngày làm việc hiệu quả.
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                3
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 p-1 pr-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tanaka&backgroundColor=e2e8f0"
                  alt="User avatar"
                  className="w-8 h-8 rounded-full bg-slate-200"
                />
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium leading-tight">
                    Tanaka K.
                  </div>
                  <div className="text-[10px] text-slate-500">
                    日本人スタッフ
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
                    <User className="w-4 h-4 mr-2" /> プロフィール (Profile)
                  </Link>
                  <hr className="my-1 border-slate-100" />
                  <Link
                    href="/login"
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> ログアウト (Đăng xuất)
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
