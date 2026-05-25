"use client";

import { useEffect, useState } from "react";

type RoleKey = "staff" | "admin";

type RoleInfo = {
  key: RoleKey;
  ja: string;
  vi: string;
  description: string;
  permissions: string[];
};

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
  status: "active";
};

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  nationality: "vn" | "jp";
  role: "employee" | "leader";
  avatar_url: string;
};

const roles: RoleInfo[] = [
  {
    key: "staff",
    ja: "日越スタッフ",
    vi: "Nhân viên Nhật - Việt",
    description:
      "日々のChat/Task/Wiki/掲示板で業務を行うメンバー / Thành viên làm việc hàng ngày trên Chat, Task, Wiki và Bảng tin cộng đồng.",
    permissions: [
      "社内チャット・1対1連絡 / Chat nội bộ và trao đổi 1-1",
      "個人・チームTaskの作成更新 / Tạo/Cập nhật task cá nhân và theo nhóm",
      "Wikiの閲覧と修正提案 / Đọc và đề xuất chỉnh sửa Wiki",
      "掲示板通知の閲覧とリアクション / Xem thông báo và react trên bảng tin",
    ],
  },
  {
    key: "admin",
    ja: "管理者",
    vi: "Quản trị viên",
    description:
      "システム運用・アカウント管理・権限設定・コンテンツ審査を担当 / Vai trò vận hành hệ thống, quản lý tài khoản, cấu hình quyền và kiểm duyệt nội dung.",
    permissions: [
      "ユーザー/ロールのフル管理 / Toàn quyền quản lý user/role",
      "Wiki・掲示板コンテンツの審査/非表示 / Duyệt và ẩn nội dung Wiki/Bảng tin",
      "システム通知の管理 / Quản lý thông báo hệ thống",
      "操作ログ・セキュリティ監査 / Xem nhật ký hoạt động và bảo mật",
    ],
  },
];

const roleLabel = (role: UserRole) => {
  if (role === "admin") return "管理者 / Quản trị viên";
  return "日越スタッフ / Nhân viên";
};

const sortUsersByName = (list: UserRow[]) =>
  [...list].sort((left, right) =>
    left.name.localeCompare(right.name, "vi", { sensitivity: "base" }),
  );

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
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    nationality: "vn",
    role: "employee",
    avatar_url: "",
  });

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
        const response = await fetch(`${API_BASE_URL}/api/users`, {
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
            status: "active";
          }>;
          error?: string;
        };

        if (!active) return;

        if (!response.ok) {
          setUsersError(data.error ?? "Không tải được danh sách người dùng.");
          return;
        }

        const nextUsers = (data.users ?? []).map((user) => ({
          ...user,
        }));

        setUsers(nextUsers);
      } catch {
        if (active) {
          setUsersError("Không tải được danh sách người dùng.");
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
  }, [API_BASE_URL]);

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
  const isAdminView = isPrivilegedRole;
  const normalizedUserQuery = userQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesQuery =
      normalizedUserQuery.length === 0 ||
      [user.name, user.team, user.email, roleLabel(user.role)].some((value) =>
        value.toLowerCase().includes(normalizedUserQuery),
      );
    return matchesQuery;
  });
  const sortedFilteredUsers = [...filteredUsers].sort((left, right) =>
    left.name.localeCompare(right.name, "vi", { sensitivity: "base" }),
  );
  const visibleUsers = showAllUsers ? sortedFilteredUsers : sortedFilteredUsers.slice(0, 5);

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">管理者設定画面</h2>
            <p className="text-xs text-slate-500 mt-1">
                {viewMode === "admin" ? (
                  <>
                    <span className="block">管理者表示</span>
                    <span className="block">Chế độ quản trị (đầy đủ)</span>
                  </>
                ) : (
                  <>
                    <span className="block">ユーザー表示</span>
                    <span className="block">Chế độ người dùng (chỉ cấu hình)</span>
                  </>
                )}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              className={switchClass("user")}
              onClick={() => setViewMode("user")}
            >
              ユーザー / Người dùng
            </button>
            <button
              type="button"
              className={switchClass("admin")}
              onClick={() => setViewMode("admin")}
            >
              管理者 / Admin
            </button>
          </div>
        </header>

        {isAdminView && isPrivilegedRole && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3">
               <span className="block">権限ロール</span>
               <span className="block text-slate-400">Ma trận quyền</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {roles.map((role) => (
                <article
                  key={role.key}
                  className="rounded-xl border border-slate-200 p-4 bg-slate-50/40"
                >
                  <h4 className="text-sm font-bold text-slate-900">
                    <span className="block">{role.ja}</span>
                    <span className="block">{role.vi}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                      <span className="block">{role.description.split(" / ")[0]}</span>
                      <span className="block">{role.description.split(" / ")[1] ?? ""}</span>
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                    {role.permissions.map((permission) => {
                      const [ja, vi] = permission.split(" / ");
                      return (
                        <li key={permission}>
                          <span className="block">- {ja}</span>
                          <span className="block">{vi}</span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {isAdminView && isPrivilegedRole && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">
                <span className="block">ユーザー管理</span>
                <span className="block">Quản lý người dùng</span>
              </h3>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  setCreateUserError(null);
                  setCreateUserSuccess(null);
                  setIsCreateUserOpen(true);
                }}
              >
                 <span className="block">+ ユーザー追加</span>
                 <span className="block">Thêm người dùng</span>
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <input
                className="flex-1 min-w-55 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="ユーザー検索 / Tìm người dùng..."
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
              />
<select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as "all" | "active" | "pending",
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">すべて / Tất cả</option>
          <option value="active">有効 / Đang hoạt động</option>
          <option value="pending">保留 / Chờ xử lý</option>
        </select>
        <span className="text-xs text-slate-400">
          <span className="block">{sortedFilteredUsers.length} 件</span>
          <span className="block">{sortedFilteredUsers.length} người dùng</span>
        </span>
              </span>
            </div>

            <div className="mb-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAllUsers((value) => !value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {showAllUsers ? "Thu gọn" : "Xem tất cả"}
              </button>
            </div>

            {usersLoading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Đang tải danh sách người dùng...
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
                  </tr>
                </thead>
                <tbody>
                  {!usersLoading && !usersError && visibleUsers.length === 0 ? (
                    <tr>
                      <td
                              colSpan={4}
                        className="py-6 text-center text-xs text-slate-500"
                      >
                        <span className="block">該当するユーザーがいません</span>
                        <span className="block">Không có user phù hợp.</span>
                      </td>
                    </tr>
                  ) : (
                    visibleUsers.map((u) => (
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
                              u.status === "active"
                                ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                                : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                            }
                          >
                            {u.status === "active" ? "有効 / Đang hoạt động" : "保留 / Chờ xử lý"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!showAllUsers && sortedFilteredUsers.length > 5 && (
              <p className="mt-2 text-xs text-slate-500">
                Đang ẩn {sortedFilteredUsers.length - 5} user còn lại.
              </p>
            )}

            {isCreateUserOpen && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="text-sm font-semibold text-slate-800">Thêm người dùng</h4>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    onClick={() => setIsCreateUserOpen(false)}
                  >
                    Đóng
                  </button>
                </div>

                {createUserError && (
                  <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {createUserError}
                  </div>
                )}

                {createUserSuccess && (
                  <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {createUserSuccess}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Name *</span>
                    <input
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={createUserForm.name}
                      onChange={(event) => setCreateUserForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Tên hiển thị"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Email *</span>
                    <input
                      type="email"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={createUserForm.email}
                      onChange={(event) => setCreateUserForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="user@example.com"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Password *</span>
                    <input
                      type="password"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={createUserForm.password}
                      onChange={(event) => setCreateUserForm((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="Mật khẩu đăng nhập"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Nationality *</span>
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={createUserForm.nationality}
                      onChange={(event) => setCreateUserForm((prev) => ({ ...prev, nationality: event.target.value as "vn" | "jp" }))}
                    >
                      <option value="vn">VN</option>
                      <option value="jp">JP</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Role *</span>
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={createUserForm.role}
                      onChange={(event) => setCreateUserForm((prev) => ({ ...prev, role: event.target.value as "employee" | "leader" }))}
                    >
                      <option value="employee">Employee</option>
                      <option value="leader">Leader</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm md:col-span-2">
                    <span className="text-slate-700">Avatar URL</span>
                    <input
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={createUserForm.avatar_url}
                      onChange={(event) => setCreateUserForm((prev) => ({ ...prev, avatar_url: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setIsCreateUserOpen(false)}
                    disabled={createUserSubmitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                    disabled={createUserSubmitting}
                    onClick={async () => {
                      const token = localStorage.getItem("authToken");
                      if (!token) return;

                      setCreateUserError(null);
                      setCreateUserSuccess(null);
                      setCreateUserSubmitting(true);

                      try {
                        const response = await fetch(`${API_BASE_URL}/api/users`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(createUserForm),
                        });
                        const data = await response.json() as { user?: UserRow; error?: string };

                        if (!response.ok) {
                          setCreateUserError(data.error ?? "Không tạo được user mới.");
                          return;
                        }

                        const createdUser = data.user;
                        if (createdUser) {
                          setUsers((prev) => sortUsersByName([...prev, createdUser]));
                        }

                        setCreateUserSuccess("Tạo user thành công.");
                        setCreateUserForm({
                          name: "",
                          email: "",
                          password: "",
                          nationality: "vn",
                          role: "employee",
                          avatar_url: "",
                        });
                      } catch {
                        setCreateUserError("Không tạo được user mới.");
                      } finally {
                        setCreateUserSubmitting(false);
                      }
                    }}
                  >
                    {createUserSubmitting ? "Đang lưu..." : "Tạo người dùng"}
                  </button>
                </div>
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

        {isAdminView && isPrivilegedRole && (
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
