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

const roleLabel = (role: UserRole) => {
  if (role === "admin") return "管理者 / Quản trị viên";
  return "日越スタッフ / Nhân viên";
};
export default function AdminPage() {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE ??
    "http://localhost:4000";
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
                Trang {usersPage} / {totalPages}
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
                  Trước
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setUsersPage((page) => Math.min(totalPages, page + 1))}
                  disabled={usersPage >= totalPages}
                >
                  Sau
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
                <div className="mt-1 text-lg font-bold text-slate-900">12</div>
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
    </main>
  );
}
