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
};

type FeedbackItem = {
  id: string;
  content: string;
  employees?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

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

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let active = true;
    const token = localStorage.getItem("authToken");
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE ??
      "http://localhost:4000";

    const loadFeedbacks = async () => {
      try {
        setFeedbackLoading(true);
        setFeedbackError("");
        const response = await fetch(`${API_BASE_URL}/api/employees/${encodeURIComponent(user.id ?? "")}/feedbacks`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = await response.json();

        if (!response.ok || !payload?.success || !active) {
          throw new Error(payload?.error || "Failed to load feedbacks");
        }

        setFeedbacks((payload.feedbacks ?? []) as FeedbackItem[]);
      } catch (loadError) {
        if (!active) return;
        setFeedbackError(loadError instanceof Error ? loadError.message : "Failed to load feedbacks");
      } finally {
        if (active) setFeedbackLoading(false);
      }
    };

    void loadFeedbacks();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const displayName = user?.name || user?.email?.split("@")[0] || "Người dùng";
  const displayRole =
    user?.role === "admin"
      ? "管理者 / Quản trị viên"
      : user?.nationality === "jp"
        ? "日本人スタッフ / Nhân viên Nhật"
        : user?.nationality === "vn"
          ? "日越スタッフ / Nhân viên Nhật - Việt"
          : "スタッフ / Nhân viên";

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
            <span className="block">プロフィールと評価画面</span>
            <span className="block">Màn hình hồ sơ & đánh giá</span>
          </p>
          {feedbackLoading ? (
            <p className="text-sm text-slate-500">
              <span className="block">評価を読み込み中...</span>
              <span className="block">Đang tải đánh giá...</span>
            </p>
          ) : feedbackError ? (
            <p className="text-sm text-red-500">{feedbackError}</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {feedbacks.length === 0 ? (
                <li className="border border-dashed border-slate-200 rounded-lg p-3 text-slate-500">
                  <span className="block">評価がありません</span>
                  <span className="block">Chưa có đánh giá nào.</span>
                </li>
              ) : (
                feedbacks.map((feedback) => (
                  <li key={feedback.id} className="border border-slate-100 rounded-lg p-3">
                    <p className="font-semibold text-slate-800">
                      {feedback.employees?.name ?? "不明 / Không rõ"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{feedback.content}</p>
                  </li>
                ))
              )}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
