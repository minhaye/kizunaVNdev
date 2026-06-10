"use client";

import { useEffect, useState } from "react";

type UserRole = "employee" | "leader" | "admin";

type UserRow = {
  id: string;
  name: string;
  email: string;
  team: string;
  role: UserRole;
  source: "employees" | "admins";
  avatar_url: string | null;
  last_online: string | null;
  status: "active" | "inactive";
};

type PendingItem = {
  id: string;
  type: "post" | "wiki";
  title: string;
  content: string;
  topic?: string;
  created_by: string;
  created_at: string;
};

const roleLabel = (role: UserRole) => {
  if (role === "admin") return "管理者 / Quản trị viên";
  return "日越スタッフ / Nhân viên";
};
export default function AdminPage() {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE ??
    "https://kizunavn-server.onrender.com";
  const [currentRole, setCurrentRole] = useState<"employee" | "admin" | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [messageTaskNotifications, setMessageTaskNotifications] = useState(true);
  const [loginRetentionDays, setLoginRetentionDays] = useState<30 | 60 | 90>(30);
  const [showActiveStatus, setShowActiveStatus] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize] = useState(5);
  const [usersTotal, setUsersTotal] = useState(0);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Pending review state
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const pendingPageSize = 5;
  const [previewItem, setPreviewItem] = useState<PendingItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) return;

      const user = JSON.parse(rawUser) as { role?: string };
      const nextRole = (user.role === "admin") ? "admin" : "employee";
      setCurrentRole(nextRole);
    } catch {
      setCurrentRole("employee");
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    let active = true;

    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json() as {
          settings?: {
            theme_mode?: "light" | "dark";
            message_task_notifications?: boolean;
            login_retention_days?: 30 | 60 | 90;
            show_active_status?: boolean;
          };
        };

        if (!response.ok || !data.settings || !active) return;

          setThemeMode(data.settings.theme_mode === "dark" ? "dark" : "light");
          setMessageTaskNotifications(data.settings.message_task_notifications ?? true);
        setLoginRetentionDays(data.settings.login_retention_days ?? 30);
        setShowActiveStatus(data.settings.show_active_status ?? true);
      } catch {
        // Keep local defaults if the backend is unavailable.
      } finally {
        if (active) {
          setSettingsLoaded(true);
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    let active = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);

      try {
        const query = userQuery.trim();
        const params = new URLSearchParams({
          page: String(usersPage),
          limit: String(usersPageSize),
        });
        if (query.length > 0) {
          params.set("q", query);
        }

        const response = await fetch(`${API_BASE_URL}/api/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json() as {
          users?: Array<{
            id: string;
            name: string;
            email: string;
            team: string;
            role: UserRole;
            source: "employees" | "admins";
            avatar_url: string | null;
            last_online: string | null;
            is_online: boolean;
            status: "active" | "inactive";
          }>;
          total?: number;
          page?: number;
          limit?: number;
          error?: string;
        };

        if (!active) return;

        if (!response.ok) {
          setUsersError(data.error ?? "ユーザー一覧を取得できません。/ Không tải được danh sách người dùng.");
          return;
        }

        setUsers((data.users ?? []).map((user) => ({ ...user })));
        setUsersTotal(data.total ?? 0);
      } catch {
        if (active) {
          setUsersError("ユーザー一覧を取得できません。/ Không tải được danh sách người dùng.");
        }
      } finally {
        if (active) {
          setUsersLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, [API_BASE_URL, userQuery, usersPage, usersPageSize]);

  // Load pending items for review
  useEffect(() => {
    if (currentRole !== "admin") return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    let active = true;

    const loadPendingItems = async () => {
      setPendingLoading(true);

      try {
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
        };

        // Fetch pending posts
        const postsRes = await fetch(`${API_BASE_URL}/api/posts`, { headers });
        const postsData = await postsRes.json() as { ok?: boolean; data?: Array<{ id: string; title: string; content: string; topic?: string; created_by: string; created_at: string; status: string }> };

        // Fetch pending wiki articles
        const wikiRes = await fetch(`${API_BASE_URL}/api/wiki`, { headers });
        const wikiData = await wikiRes.json() as { ok?: boolean; data?: Array<{ id: string; title: string; content: string; tag?: string; created_by: string; created_at: string; status: string }> };

        if (!active) return;

        const combined: PendingItem[] = [];

        if (postsData?.ok && Array.isArray(postsData.data)) {
          postsData.data
            .filter((p) => p.status === "pending")
            .forEach((p) => {
              combined.push({
                id: p.id,
                type: "post",
                title: p.title,
                content: p.content,
                topic: p.topic,
                created_by: p.created_by,
                created_at: p.created_at,
              });
            });
        }

        if (wikiData?.ok && Array.isArray(wikiData.data)) {
          wikiData.data
            .filter((a) => a.status === "pending")
            .forEach((a) => {
              combined.push({
                id: a.id,
                type: "wiki",
                title: a.title,
                content: a.content,
                topic: a.tag,
                created_by: a.created_by,
                created_at: a.created_at,
              });
            });
        }

        // Sort by newest first
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setPendingItems(combined);
      } catch {
        // Silently fail
      } finally {
        if (active) setPendingLoading(false);
      }
    };

    void loadPendingItems();

    return () => {
      active = false;
    };
  }, [API_BASE_URL, currentRole]);

  useEffect(() => {
    if (!settingsLoaded) return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    const timer = window.setTimeout(() => {
      const payload = {
        theme_mode: themeMode,
        message_task_notifications: messageTaskNotifications,
        login_retention_days: loginRetentionDays,
        show_active_status: showActiveStatus,
      };

      window.dispatchEvent(
        new CustomEvent("account-settings-updated", {
          detail: {
            themeMode,
            messageTaskNotifications,
            showActiveStatus,
          },
        }),
      );

      void fetch(`${API_BASE_URL}/api/settings/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [API_BASE_URL, themeMode, messageTaskNotifications, loginRetentionDays, showActiveStatus, settingsLoaded]);

  const isPrivilegedRole = currentRole === "admin";
  const totalPages = Math.max(1, Math.ceil(usersTotal / usersPageSize));
  const pendingTotalPages = Math.max(1, Math.ceil(pendingItems.length / pendingPageSize));
  const displayedPending = pendingItems.slice(
    (pendingPage - 1) * pendingPageSize,
    pendingPage * pendingPageSize,
  );

  useEffect(() => {
    if (usersPage > totalPages) {
      setUsersPage(totalPages);
    }
  }, [usersPage, totalPages]);

  const handleToggleUserStatus = async (user: UserRow) => {
    if (user.source !== "employees") return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const nextStatus = user.status === "active" ? "inactive" : "active";
    setUpdatingUserId(user.id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ source: user.source, status: nextStatus }),
      });
      const data = await response.json() as { user?: { id: string; status: "active" | "inactive" }; error?: string };

      if (!response.ok || !data.user) {
        setUsersError(data.error ?? "状態を更新できません。/ Không cập nhật được trạng thái.");
        return;
      }

      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: data.user?.status ?? nextStatus } : item)));
    } catch {
      setUsersError("状態を更新できません。/ Không cập nhật được trạng thái.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleApprove = async (item: PendingItem) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const endpoint = item.type === "post"
      ? `${API_BASE_URL}/api/posts/${item.id}/approve`
      : `${API_BASE_URL}/api/wiki/${item.id}/approve`;

    setActionLoading(item.id);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json() as { ok?: boolean; error?: string };

      if (!response.ok || !data?.ok) {
        alert(data?.error || "Duyệt bài thất bại");
        return;
      }

      // Remove from pending list
      setPendingItems((prev) => prev.filter((i) => i.id !== item.id));
      setPreviewItem(null);
    } catch {
      alert("Có lỗi khi duyệt bài");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (item: PendingItem) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const endpoint = item.type === "post"
      ? `${API_BASE_URL}/api/posts/${item.id}/reject`
      : `${API_BASE_URL}/api/wiki/${item.id}/reject`;

    setActionLoading(item.id);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json() as { ok?: boolean; error?: string };

      if (!response.ok || !data?.ok) {
        alert(data?.error || "Từ chối bài thất bại");
        return;
      }

      // Remove from pending list
      setPendingItems((prev) => prev.filter((i) => i.id !== item.id));
      setPreviewItem(null);
    } catch {
      alert("Có lỗi khi từ chối bài");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">設定 / Cấu hình</h2>
            <p className="text-xs text-slate-500 mt-1">
              {isPrivilegedRole
                ? "管理者表示 / Admin view: system + content"
                : "ユーザー表示 / User view: system only"}
            </p>
          </div>
        </header>

        {isPrivilegedRole && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3">
              <span className="block">審査承認 / Duyệt bài viết</span>
              <span className="block text-xs font-normal text-slate-500">Duyệt bài đăng (Bảng tin) và bài viết Wiki</span>
            </h3>

            {pendingLoading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <span className="block">審査待ちの記事を読み込んでいます... / Đang tải danh sách bài chờ duyệt...</span>
              </div>
            ) : pendingItems.length === 0 ? (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-6 text-center text-sm text-slate-500">
                <span className="block">審査待ちの記事はありません / Không có bài viết nào đang chờ duyệt</span>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedPending.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.type === "post"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}>
                          {item.type === "post" ? "📋 Bảng tin" : "📖 Wiki"}
                        </span>
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {item.created_by} • {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        詳細 / Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApprove(item)}
                        disabled={actionLoading === item.id}
                        className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                      >
                        {actionLoading === item.id ? "..." : "承認 / Duyệt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReject(item)}
                        disabled={actionLoading === item.id}
                        className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        拒否 / Từ chối
                      </button>
                    </div>
                  </div>
                ))}
                
                {pendingTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      ページ {pendingPage} / {pendingTotalPages} (Trang)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                        disabled={pendingPage <= 1}
                      >
                        前へ / Trước
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
                        disabled={pendingPage >= pendingTotalPages}
                      >
                        次へ / Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-3">
              <span className="block">システム設定</span>
              <span className="block">Cấu hình hệ thống</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="rounded-lg border border-slate-100 p-3 flex flex-col gap-2">
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Chế độ sáng tối / テーマ設定
                </span>
                <span className="text-xs text-slate-500">
                  Tùy chỉnh giao diện hiển thị / 表示テーマを選択します。
                </span>
              </span>
              <select
                value={themeMode}
                onChange={(event) => setThemeMode(event.target.value as "light" | "dark")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="light">Sáng / ライト</option>
                <option value="dark">Tối / ダーク</option>
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <input
                type="checkbox"
                checked={messageTaskNotifications}
                onChange={(event) => setMessageTaskNotifications(event.target.checked)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800">
                  Bật thông báo tin nhắn / メッセージ通知
                </span>
                <span className="text-xs text-slate-500">
                  Khi có tin nhắn hoặc task mới, chuông góc phải sẽ hiển thị số chưa đọc.
                </span>
              </span>
            </label>

            <label className="rounded-lg border border-slate-100 p-3 flex flex-col gap-2">
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Lưu đăng nhập / ログイン保持
                </span>
                <span className="text-xs text-slate-500">
                  Giữ đăng nhập trên thiết bị này trong số ngày bạn chọn.
                </span>
              </span>
              <select
                value={loginRetentionDays}
                onChange={(event) => setLoginRetentionDays(Number(event.target.value) as 30 | 60 | 90)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value={30}>30 ngày</option>
                <option value={60}>60 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <input
                type="checkbox"
                checked={showActiveStatus}
                onChange={(event) => setShowActiveStatus(event.target.checked)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800">
                  Trạng thái hoạt động / オンライン状態
                </span>
                <span className="text-xs text-slate-500">
                  Hiển thị chấm màu ở góc tài khoản để biết đang online hay offline.
                </span>
              </span>
            </label>
          </div>
        </section>

        {isPrivilegedRole && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">
                <span className="block">ユーザー管理</span>
                <span className="block">Quản lý tài khoản</span>
              </h3>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <input
                className="flex-1 min-w-55 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="ユーザー検索 / Tìm người dùng..."
                value={userQuery}
                onChange={(event) => {
                  setUserQuery(event.target.value);
                  setUsersPage(1);
                }}
              />
              <span className="text-xs text-slate-400">
                <span className="block">{usersTotal} 件</span>
                <span className="block">{usersTotal} tài khoản</span>
              </span>
            </div>

            {usersLoading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <span className="block">ユーザー一覧を読み込み中...</span>
                <span className="block">Đang tải danh sách người dùng...</span>
              </div>
            ) : usersError ? (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {usersError}
              </div>
            ) : null}

            <div className="overflow-x-auto mt-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-3 font-medium">
                      <span className="block">氏名</span>
                      <span className="block">Tên</span>
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      <span className="block">チーム</span>
                      <span className="block">Nhóm</span>
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      <span className="block">ロール</span>
                      <span className="block">Vai trò</span>
                    </th>
                    <th className="py-2 font-medium">
                      <span className="block">状態</span>
                      <span className="block">Trạng thái</span>
                    </th>
                    <th className="py-2 font-medium">
                      <span className="block">操作</span>
                      <span className="block">Kích hoạt</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!usersLoading && !usersError && users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-xs text-slate-500"
                      >
                        <span className="block">該当するユーザーがいません</span>
                        <span className="block">Không có user phù hợp.</span>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-3 pr-3 text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 overflow-hidden">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt={u.name} className="h-full w-full object-cover" />
                              ) : (
                                <span>{u.name.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{u.name}</div>
                              <div className="text-xs text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-slate-600">{u.team}</td>
                        <td className="py-3 pr-3 text-slate-700">
                          {roleLabel(u.role)}
                        </td>
                        <td className="py-3">
                          <span
                            className={
                              u.status === "inactive"
                                ? "inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700"
                                : "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            }
                          >
                            {u.status === "inactive" ? "停止 / Vô hiệu" : "有効 / Đang hoạt động"}
                          </span>
                        </td>
                        <td className="py-3">
                          {u.source === "admins" ? (
                            <span className="text-xs text-slate-400">N/A</span>
                          ) : (
                            <button
                              type="button"
                              className={
                                u.status === "inactive"
                                  ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                  : "rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                              }
                              onClick={() => void handleToggleUserStatus(u)}
                              disabled={updatingUserId === u.id}
                            >
                              {updatingUserId === u.id
                                ? "更新中... / Đang cập nhật..."
                                : u.status === "inactive"
                                  ? "有効化 / Kích hoạt"
                                  : "無効 / Vô hiệu"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                ページ {usersPage} / {totalPages} (Trang)
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={usersPage}
                  onChange={(event) => setUsersPage(Number(event.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setUsersPage((page) => Math.max(1, page - 1))}
                  disabled={usersPage <= 1}
                >
                  前へ / Trước
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setUsersPage((page) => Math.min(totalPages, page + 1))}
                  disabled={usersPage >= totalPages}
                >
                  次へ / Sau
                </button>
              </div>
            </div>
          </section>
        )}

        {isPrivilegedRole && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-2">
              <span className="block">コンテンツ管理</span>
              <span className="block">Quản lý nội dung</span>
            </h3>
            <p className="text-sm text-slate-600">
              Wiki審査フロー、掲示板通知、公開スケジュール、ロール別編集ログを設定
              / Thiết lập quy trình duyệt bài Wiki, quản lý thông báo bảng tin,
              lịch xuất bản và nhật ký chỉnh sửa theo từng role.
            </p>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="text-slate-500">
                  審査待ち記事 / Bài chờ duyệt
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{pendingItems.length}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="text-slate-500">
                  予約済み通知 / Thông báo đã lên lịch
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">5</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="text-slate-500">
                  モデレーション警告 / Cảnh báo moderation
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">2</div>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 px-4 grid place-items-center"
          onClick={() => setPreviewItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl max-h-[80vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    previewItem.type === "post"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }`}>
                    {previewItem.type === "post" ? "📋 Bảng tin" : "📖 Wiki"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{previewItem.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {previewItem.created_by} • {new Date(previewItem.created_at).toLocaleDateString("vi-VN")}
                  {previewItem.topic ? ` • ${previewItem.topic}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                aria-label="閉じる / Đóng"
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap overflow-y-auto flex-1">
              {previewItem.content}
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => void handleReject(previewItem)}
                disabled={actionLoading === previewItem.id}
                className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
              >
                {actionLoading === previewItem.id ? "..." : "拒否 / Từ chối"}
              </button>
              <button
                type="button"
                onClick={() => void handleApprove(previewItem)}
                disabled={actionLoading === previewItem.id}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                {actionLoading === previewItem.id ? "..." : "承認 / Duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
