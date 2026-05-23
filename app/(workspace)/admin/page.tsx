"use client";

import { useState } from "react";

type RoleKey = "staff" | "admin";

type RoleInfo = {
  key: RoleKey;
  ja: string;
  vi: string;
  description: string;
  permissions: string[];
};

type UserRow = {
  name: string;
  team: string;
  role: RoleKey;
  status: "active" | "pending";
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

const users: UserRow[] = [
  { name: "Tanaka Ken", team: "Operation", role: "staff", status: "active" },
  { name: "Nguyen Van Nam", team: "Content", role: "staff", status: "active" },
  { name: "Sato Miki", team: "HR", role: "staff", status: "pending" },
  { name: "System Admin", team: "Core", role: "admin", status: "active" },
];

const roleLabel = (role: RoleKey) =>
  role === "admin"
    ? "管理者 / Quản trị viên"
    : "日越スタッフ / Nhân viên Nhật - Việt";

export default function AdminPage() {
  const [viewMode, setViewMode] = useState<"admin" | "user">("admin");
  const [userQuery, setUserQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending"
  >("all");
  const normalizedUserQuery = userQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesQuery =
      normalizedUserQuery.length === 0 ||
      [user.name, user.team, roleLabel(user.role)].some((value) =>
        value.toLowerCase().includes(normalizedUserQuery),
      );
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const switchClass = (mode: "admin" | "user") =>
    viewMode === mode
      ? "rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white"
      : "rounded-md px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100";

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

        {viewMode === "admin" && (
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

        {viewMode === "admin" && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">
                <span className="block">ユーザー管理</span>
                <span className="block">Quản lý người dùng</span>
              </h3>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
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
                <span className="block">{filteredUsers.length} 件</span>
                <span className="block">{filteredUsers.length} người dùng</span>
              </span>
            </div>

            <div className="overflow-x-auto">
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
                  {filteredUsers.length === 0 ? (
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
                    filteredUsers.map((u) => (
                      <tr
                        key={u.name}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-3 pr-3 text-slate-800">{u.name}</td>
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
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-3">
              <span className="block">システム設定</span>
              <span className="block">Cấu hình hệ thống</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <input type="checkbox" defaultChecked className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  メール認証を必須化 / Yêu cầu xác minh email khi tạo tài khoản
                </span>
                <span className="text-xs text-slate-500">
                  Bắt buộc với cả 2 role: 日越スタッフ và 管理者.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <input type="checkbox" defaultChecked className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  ログイン履歴を90日保持 / Nhật ký đăng nhập 90 ngày
                </span>
                <span className="text-xs text-slate-500">
                  社内セキュリティ向けのアクセス追跡 / Theo dõi truy cập để hỗ
                  trợ bảo mật nội bộ.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <input type="checkbox" defaultChecked className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  掲示板公開前に審査 / Duyệt nội dung bảng tin trước khi public
                </span>
                <span className="text-xs text-slate-500">
                  正式公開は管理者のみ / Chỉ 管理者 có quyền publish chính thức.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <input type="checkbox" className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  リアルタイムセキュリティ警告 / Bật cảnh báo bảo mật theo thời
                  gian thực
                </span>
                <span className="text-xs text-slate-500">
                  異常検知時に管理者へ通知 / Gửi cảnh báo đến nhóm 管理者 khi
                  phát hiện bất thường.
                </span>
              </span>
            </label>
          </div>
        </section>

        {viewMode === "admin" && (
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

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-2">
            <span className="block">通知設定</span>
            <span className="block">Cài đặt thông báo</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="rounded-lg border border-slate-100 p-3 flex items-center justify-between">
              <span>日次メール要約 / Email digest hàng ngày</span>
              <input type="checkbox" defaultChecked />
            </label>
            <label className="rounded-lg border border-slate-100 p-3 flex items-center justify-between">
              <span>期限超過タスク警告 / Cảnh báo task quá hạn</span>
              <input type="checkbox" defaultChecked />
            </label>
            <label className="rounded-lg border border-slate-100 p-3 flex items-center justify-between">
              <span>Wikiレビュー通知 / Nhắc review Wiki</span>
              <input type="checkbox" defaultChecked />
            </label>
            <label className="rounded-lg border border-slate-100 p-3 flex items-center justify-between">
              <span>新規ログイン通知 / Thông báo đăng nhập mới</span>
              <input type="checkbox" defaultChecked />
            </label>
          </div>
        </section>
      </div>
    </main>
  );
}
