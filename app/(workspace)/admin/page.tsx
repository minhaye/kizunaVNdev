"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

type ViewMode = "admin" | "user";
type ThemeMode = "light" | "dark" | "system";
type RoleKey = "staff" | "admin";
type UserSource = "employees" | "admins";
type UserStatus = "active" | "pending";
type UserRole = "employee" | "leader" | "admin";

type RoleInfo = {
  key: RoleKey;
  ja: string;
  vi: string;
  description: string;
  permissions: string[];
};

type ManagedUser = {
  id: string;
  source: UserSource;
  name: string;
  email: string;
  team: string;
  role: UserRole;
  status: UserStatus;
  nationality?: "vn" | "jp";
  avatar_url?: string | null;
};

type UserRow = ManagedUser;

type UserDraft = {
  name: string;
  email: string;
  password: string;
  team: string;
  nationality: "vn" | "jp";
  role: "employee" | "leader";
  status: UserStatus;
};

type PendingPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  channel: string;
  author: string;
  created_at: string;
  status: "pending" | "published" | "rejected";
};

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:4000";
const API_BASE_URL = apiBase;

const emptyUserDraft: UserDraft = {
  name: "",
  email: "",
  password: "",
  team: "",
  nationality: "vn",
  role: "employee",
  status: "active",
};

const emptyCreateUserForm = {
  name: "",
  email: "",
  password: "",
  nationality: "vn" as "vn" | "jp",
  role: "employee" as "employee" | "leader",
  avatar_url: "",
};

const sortUsersByName = (list: ManagedUser[]) =>
  [...list].sort((left, right) =>
    left.name.localeCompare(right.name, "vi", { sensitivity: "base" }),
  );

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

const authHeaders = (json = false): HeadersInit => {
  const headers: Record<string, string> = {};

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

const roleLabel = (role: UserRole) => {
  if (role === "admin") return "管理者 / Quản trị viên";
  if (role === "leader") return "リーダー / Trưởng nhóm";
  return "日越スタッフ / Nhân viên Nhật - Việt";
};

const statusClass = (status: UserStatus) =>
  status === "active"
    ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
    : "inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700";

const formatPostDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toISOString().slice(0, 10)} ${date.toTimeString().slice(0, 5)}`;
};

export default function AdminPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("admin");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [userError, setUserError] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUserDraft);
  const [savingUser, setSavingUser] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);

  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postFilter, setPostFilter] = useState<"all" | "wiki" | "board">("all");
  const [postError, setPostError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [moderatingPostId, setModeratingPostId] = useState<string | null>(null);
  const [loginRetentionDays, setLoginRetentionDays] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    const storedTheme = localStorage.getItem("themeMode") as ThemeMode | null;
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      setThemeMode(storedTheme);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadPendingPosts();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedUserQuery = userQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        normalizedUserQuery.length === 0 ||
        [user.name, user.email, user.team, roleLabel(user.role)].some((value) =>
          value.toLowerCase().includes(normalizedUserQuery),
        );
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [statusFilter, userQuery, users]);
  const showAllUsers = true;
  const sortedFilteredUsers = filteredUsers;

  const filteredPendingPosts = useMemo(() => {
    if (postFilter === "all") return pendingPosts;

    return pendingPosts.filter((post) => {
      const channel = post.channel.toLowerCase();
      if (postFilter === "wiki") return channel.includes("wiki");
      return channel.includes("bảng") || channel.includes("掲示") || channel.includes("board");
    });
  }, [pendingPosts, postFilter]);

  const switchClass = (mode: ViewMode) =>
    viewMode === mode
      ? "rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
      : "rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100";

  const handleThemeChange = (value: ThemeMode) => {
    setThemeMode(value);
    localStorage.setItem("themeMode", value);
    document.documentElement.dataset.theme = value;
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUserError(null);

    try {
      const response = await fetch(`${apiBase}/api/admin/users`, {
        headers: authHeaders(),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: ManagedUser[];
        error?: string;
      };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Không tải được danh sách user.");
      }

      setUsers(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : String(error));
    } finally {
      setUsersLoading(false);
    }
  };

  const loadPendingPosts = async () => {
    setPostsLoading(true);
    setPostError(null);

    try {
      const response = await fetch(`${apiBase}/api/admin/posts/pending`, {
        headers: authHeaders(),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: PendingPost[];
        error?: string;
      };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Không tải được bài chờ duyệt.");
      }

      setPendingPosts(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setPostError(error instanceof Error ? error.message : String(error));
    } finally {
      setPostsLoading(false);
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserDraft(emptyUserDraft);
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setUserDraft({
      name: user.name,
      email: user.email,
      password: "",
      team: user.team,
      nationality: user.nationality ?? "vn",
      role: user.role === "leader" ? "leader" : "employee",
      status: user.status,
    });
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    if (savingUser) return;
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserDraft(emptyUserDraft);
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingUser(true);
    setUserError(null);

    try {
      const body =
        editingUser?.source === "admins"
          ? {
              email: userDraft.email,
              password: userDraft.password || undefined,
            }
          : {
              name: userDraft.name,
              email: userDraft.email,
              password: userDraft.password || undefined,
              team: userDraft.team,
              nationality: userDraft.nationality,
              role: userDraft.role,
              status: userDraft.status,
            };

      const endpoint = editingUser
        ? `${apiBase}/api/admin/users/${editingUser.source}/${editingUser.id}`
        : `${apiBase}/api/admin/users`;
      const method = editingUser ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Không lưu được user.");
      }

      closeUserModal();
      await loadUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async (user: ManagedUser) => {
    const confirmed = window.confirm(
      `Xóa user "${user.name}"? Thao tác này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setUserError(null);
    try {
      const response = await fetch(
        `${apiBase}/api/admin/users/${user.source}/${user.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Không xóa được user.");
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      setUserError(error instanceof Error ? error.message : String(error));
    }
  };

  const openPostDetail = async (post: PendingPost) => {
    setSelectedPost(post);
    setDetailLoading(true);
    setPostError(null);

    try {
      const response = await fetch(`${apiBase}/api/admin/posts/${post.id}`, {
        headers: authHeaders(),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: PendingPost;
        error?: string;
      };

      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(payload.error || "Không tải được chi tiết bài viết.");
      }

      setSelectedPost(payload.data);
    } catch (error) {
      setPostError(error instanceof Error ? error.message : String(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const moderatePost = async (
    post: PendingPost,
    status: "published" | "rejected",
  ) => {
    setModeratingPostId(post.id);
    setPostError(null);

    try {
      const response = await fetch(`${apiBase}/api/admin/posts/${post.id}/moderation`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Không cập nhật được trạng thái bài viết.");
      }

      setPendingPosts((current) => current.filter((item) => item.id !== post.id));
      if (selectedPost?.id === post.id) {
        setSelectedPost(null);
      }
    } catch (error) {
      setPostError(error instanceof Error ? error.message : String(error));
    } finally {
      setModeratingPostId(null);
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-50/70 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">管理者設定画面</h2>
            <p className="mt-1 text-sm text-slate-500">
              {viewMode === "admin"
                ? "管理者表示 / Admin view: full settings"
                : "ユーザー表示 / User view: configuration only"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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

        {viewMode === "admin" && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-slate-900">
              Role Matrix / 権限ロール
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((role) => (
                <article
                  key={role.key}
                  className="rounded-lg border border-slate-200 bg-slate-50/40 p-4"
                >
                  <h4 className="text-base font-bold text-slate-900">
                    {role.ja} / {role.vi}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {role.description}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {role.permissions.map((permission) => (
                      <li key={permission}>- {permission}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {viewMode === "admin" && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                ユーザー管理 / Quản lý người dùng
              </h3>
              <button
                type="button"
                onClick={openAddUser}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <UserPlus size={18} />
                + ユーザー追加 / Thêm người dùng
              </button>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-4">
              <input
                className="min-w-72 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-300"
                placeholder="ユーザー検索 / Tìm user..."
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | UserStatus)
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
              >
                <option value="all">すべて / Tất cả</option>
                <option value="active">有効 / Đang hoạt động</option>
                <option value="pending">保留 / Chờ xử lý</option>
              </select>
              <span className="text-base text-slate-400">
                {filteredUsers.length} users
              </span>
            </div>

            {userError && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {userError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="py-3 pr-4 font-semibold">Team</th>
                    <th className="py-3 pr-4 font-semibold">Role</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        Đang tải user...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        該当するユーザーがいません / Không có user phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={`${user.source}-${user.id}`}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-5 pr-4 font-medium text-slate-900">
                          {user.name}
                        </td>
                        <td className="py-5 pr-4 text-slate-700">{user.team}</td>
                        <td className="py-5 pr-4 text-slate-700">
                          {roleLabel(user.role)}
                        </td>
                        <td className="py-5 pr-4">
                          <span className={statusClass(user.status)}>
                            {user.status === "active" ? "Active" : "Pending"}
                          </span>
                        </td>
                        <td className="py-5 text-right">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              aria-label={`Edit ${user.name}`}
                              onClick={() => openEditUser(user)}
                              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${user.name}`}
                              onClick={() => void deleteUser(user)}
                              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
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

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-slate-900">
            システム設定 / Cấu hình hệ thống
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 p-4">
              <div>
                <div className="font-semibold text-slate-900">
                  Chế độ sáng tối / テーマ設定
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  Tùy chỉnh giao diện hiển thị. / 表示テーマを選択します。
                </div>
              </div>
              <select
                value={themeMode}
                onChange={(event) => handleThemeChange(event.target.value as ThemeMode)}
                className="min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <option value="system">Tự động / システム</option>
                <option value="light">Sáng / ライト</option>
                <option value="dark">Tối / ダーク</option>
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-4">
              <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 accent-teal-700" />
              <span>
                <span className="block font-semibold text-slate-900">
                  Bật thông báo tin nhắn / メッセージ通知
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Nhận cảnh báo khi có tin nhắn mới. / 新着メッセージを通知。
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-4">
              <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 accent-teal-700" />
              <span>
                <span className="block font-semibold text-slate-900">
                  Lưu đăng nhập 30 ngày / 30日間ログイン保持
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Giữ phiên đăng nhập lâu hơn. / ログイン状態を保持します。
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

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-4">
              <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 accent-teal-700" />
              <span>
                <span className="block font-semibold text-slate-900">
                  Tắt trạng thái hoạt động / オンライン状態を隠す
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Ẩn trạng thái đang hoạt động. / ステータス非表示。
                </span>
              </span>
            </label>
          </div>
        </section>

        {viewMode === "admin" && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              コンテンツ管理 / Quản lý nội dung
            </h3>
            <p className="mt-4 max-w-6xl text-base leading-8 text-slate-600">
              Wiki審査フロー、掲示板通知、公開スケジュール、ロール別編集ログを設定 /
              Thiết lập quy trình duyệt bài Wiki, quản lý thông báo bảng tin,
              lịch xuất bản và nhật ký chỉnh sửa theo từng role.
            </p>

            <div className="my-7 flex flex-wrap items-center gap-4">
              <select
                value={postFilter}
                onChange={(event) =>
                  setPostFilter(event.target.value as "all" | "wiki" | "board")
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700"
              >
                <option value="all">Tất cả / すべて</option>
                <option value="wiki">Wiki</option>
                <option value="board">Bảng tin / 掲示板</option>
              </select>
              <span className="text-base text-slate-400">
                {filteredPendingPosts.length} bài chờ duyệt
              </span>
            </div>

            {postError && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {postError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Bài viết</th>
                    <th className="py-3 pr-4 font-semibold">Kênh</th>
                    <th className="py-3 pr-4 font-semibold">Tác giả</th>
                    <th className="py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {postsLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                        Đang tải bài chờ duyệt...
                      </td>
                    </tr>
                  ) : filteredPendingPosts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                        Không có bài viết chờ duyệt.
                      </td>
                    </tr>
                  ) : (
                    filteredPendingPosts.map((post) => (
                      <tr
                        key={post.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-5 pr-4">
                          <div className="font-bold text-slate-900">{post.title}</div>
                          <div className="mt-1 text-sm text-slate-500">{post.summary}</div>
                        </td>
                        <td className="py-5 pr-4 text-slate-700">{post.channel}</td>
                        <td className="py-5 pr-4 text-slate-700">{post.author}</td>
                        <td className="py-5 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => void openPostDetail(post)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Eye size={17} />
                              Xem / 表示
                            </button>
                            <button
                              type="button"
                              disabled={moderatingPostId === post.id}
                              onClick={() => void moderatePost(post, "rejected")}
                              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                            >
                              Hủy / 却下
                            </button>
                            <button
                              type="button"
                              disabled={moderatingPostId === post.id}
                              onClick={() => void moderatePost(post, "published")}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <Check size={17} />
                              Duyệt / 承認
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-slate-900">
            通知設定 / Cài đặt thông báo
          </h3>
          <div className="grid gap-4 text-base text-slate-700 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
              <span>日次メール要約 / Email digest hằng ngày</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-700" />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
              <span>期限超過タスク警告 / Cảnh báo task quá hạn</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-700" />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
              <span>Wikiレビュー通知 / Nhắc review Wiki</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-700" />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
              <span>新規ログイン通知 / Thông báo đăng nhập mới</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-700" />
            </label>
          </div>
        </section>
      </div>

      {isUserModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4"
          onClick={closeUserModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900">
                {editingUser ? "Sửa người dùng / ユーザー編集" : "Thêm người dùng / ユーザー追加"}
              </h3>
              <button
                type="button"
                onClick={closeUserModal}
                className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveUser} className="space-y-4">
              {editingUser?.source !== "admins" && (
                <input
                  required
                  value={userDraft.name}
                  placeholder="Tên / 名前"
                  onChange={(event) =>
                    setUserDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-300"
                />
              )}

              {editingUser?.source === "admins" && (
                <input
                  required
                  type="email"
                  value={userDraft.email}
                  placeholder="Email"
                  onChange={(event) =>
                    setUserDraft((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-300"
                />
              )}

              {editingUser?.source !== "admins" && (
                <>
                  <input
                    value={userDraft.team}
                    placeholder="Phòng ban / チーム"
                    onChange={(event) =>
                      setUserDraft((current) => ({ ...current, team: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-300"
                  />

                  <select
                    value={userDraft.role}
                    onChange={(event) =>
                      setUserDraft((current) => ({
                        ...current,
                        role: event.target.value as "employee" | "leader",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800"
                  >
                    <option value="employee">Nhân viên / スタッフ</option>
                    <option value="leader">Trưởng nhóm / リーダー</option>
                  </select>

                  <select
                    value={userDraft.status}
                    onChange={(event) =>
                      setUserDraft((current) => ({
                        ...current,
                        status: event.target.value as UserStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800"
                  >
                    <option value="active">Active / 有効</option>
                    <option value="pending">Pending / 保留</option>
                  </select>
                </>
              )}

              <input
                required={!editingUser}
                type="password"
                value={userDraft.password}
                placeholder={editingUser ? "Mật khẩu mới / 新しいパスワード" : "Mật khẩu / パスワード"}
                onChange={(event) =>
                  setUserDraft((current) => ({ ...current, password: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-300"
              />

              <button
                type="submit"
                disabled={savingUser}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingUser
                  ? "Đang lưu..."
                  : editingUser
                    ? "Lưu thay đổi / 保存"
                    : "Tạo người dùng / 作成"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedPost.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedPost.channel} / {selectedPost.author}
                  {formatPostDate(selectedPost.created_at)
                    ? ` / ${formatPostDate(selectedPost.created_at)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-auto p-5 text-sm leading-7 text-slate-700">
              {detailLoading ? (
                <div className="text-slate-500">Đang tải chi tiết...</div>
              ) : (
                <div className="whitespace-pre-wrap">{selectedPost.content}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={() => void moderatePost(selectedPost, "rejected")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700"
              >
                Hủy / 却下
              </button>
              <button
                type="button"
                onClick={() => void moderatePost(selectedPost, "published")}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Check size={17} />
                Duyệt / 承認
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
