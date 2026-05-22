"use client";

import { useEffect, useState } from "react";
import Avatar from "../../components/avatar";

type CurrentUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  nationality?: string;
  avatar_url?: string | null;
  last_online?: string | null;
};

const feedbacks = [
  "Tanakaさん: 報告の粒度が良くなりました。",
  "Namさん: 翻訳サポートが速くて明確です / Translation hỗ trợ rất nhanh và rõ ràng.",
  "Team Dev: 連携がスムーズで助かりました。",
  "Hoaさん: レビューコメントが具体的で助かります。",
  "PM: 進捗更新が安定していてとても良いです / Tiến độ cập nhật đều đặn, rất tốt.",
  "Khanh: 日本語資料のサポートありがとうございます / Cảm ơn đã hỗ trợ phần tài liệu Nhật ngữ.",
  "HR: 協力的なコミュニケーションが素晴らしいです。",
  "Admin: ログ管理の整理に貢献してくれました。",
];

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    try {
      setUser(JSON.parse(raw) as CurrentUser);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("authToken");
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE ??
      "http://localhost:4000";

    const refreshUser = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data?.user || !active) return;
        setUser(data.user as CurrentUser);
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch {
        // Ignore refresh errors.
      }
    };

    void refreshUser();

    return () => {
      active = false;
    };
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "Người dùng";
  const displayRole =
    user?.role === "admin"
      ? "管理者 / Quản trị viên"
      : user?.nationality === "jp"
        ? "日本人スタッフ"
        : user?.nationality === "vn"
          ? "日越スタッフ"
          : "Nhân viên";

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center">
          <Avatar
            name={displayName}
            src={user?.avatar_url ?? null}
            className="w-20 h-20 mx-auto"
            imgClassName="mx-auto"
          />
          <h2 className="font-bold text-slate-800 mt-3">{displayName}</h2>
          <p className="text-xs text-slate-500">{displayRole}</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-slate-900">プロフィール・評価画面</h3>
          <p className="text-sm text-slate-500 mb-3">
            プロフィールと評価画面 / Màn hình Profile & Feedback
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {feedbacks.map((f) => (
              <li key={f} className="border border-slate-100 rounded-lg p-3">
                {f}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
