"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type WikiArticle = {
  slug: string;
  title: string;
  tag: string;
  status?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:4000";

export default function WikiListPage() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newContent, setNewContent] = useState("");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadArticles = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/api/wiki`);
        const payload = await response.json();

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Wiki一覧を読み込めません / Không thể tải danh sách wiki");
        }

        if (!active) return;

        const mapped = Array.isArray(payload.data)
          ? payload.data.map((article: { slug?: string; title?: string; tag?: string; status?: string }) => ({
              slug: article.slug ?? "",
              title: article.title ?? "",
              tag: article.tag ?? "General",
              status: article.status ?? "approved",
            }))
          : [];

        setArticles(
          mapped.filter((article: WikiArticle) => article.slug && article.title),
        );
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Wiki読み込みエラー / Có lỗi khi tải dữ liệu wiki");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadArticles();

    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const tags = useMemo(() => Array.from(new Set(articles.map((article) => article.tag))), [articles]);

  const filteredArticles = useMemo(
    () =>
      articles.filter((article) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [article.title, article.tag, article.slug].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          );
        const matchesTag = tagFilter === "all" || article.tag === tagFilter;
        const matchesTab = activeTab === "approved" ? article.status !== "pending" : article.status === "pending";
        return matchesQuery && matchesTag && matchesTab;
      }),
    [articles, normalizedQuery, tagFilter, activeTab],
  );

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const displayedArticles = filteredArticles.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const handleCreateWiki = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setCreating(true);

    try {
      const token = localStorage.getItem("authToken");
      const rawUser = localStorage.getItem("user");
      const user = rawUser ? (JSON.parse(rawUser) as { id?: string }) : null;

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/wiki`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newTitle,
          topic: newTag,
          content: newContent,
          employee_id: user?.id,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Wikiを作成できません / Không thể tạo bài viết Wiki");
      }

      const created = payload.data as { slug?: string; title?: string; tag?: string; status?: string };
      if (created?.slug && created?.title) {
        setArticles((prev) => [
          { slug: created.slug, title: created.title, tag: created.tag ?? "General", status: created.status ?? "pending" },
          ...prev,
        ]);
      }

      setNewTitle("");
      setNewTag("");
      setNewContent("");
      setActiveTab("pending");
      setCreateSuccess("Wikiを作成しました。管理者の承認待ちです / Tạo bài viết Wiki thành công. Bài viết đang chờ admin duyệt.");
      setCreateOpen(false);
    } catch (submitError) {
      setCreateError(
        submitError instanceof Error ? submitError.message : "Wikiの作成に失敗しました / Có lỗi khi tạo bài viết Wiki",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            <span className="block">文化Wiki記事一覧画面</span>
            <span className="block">Màn hình danh sách bài viết Wiki</span>
          </h2>
          <p className="text-sm text-slate-500">
            <span className="block">Wiki記事一覧画面</span>
            <span className="block">Màn hình danh sách bài viết Wiki</span>
          </p>
        </div>

        <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 mb-4 w-fit">
          <button
            onClick={() => { setActiveTab("approved"); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "approved"
                ? "bg-white shadow text-blue-700"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <span className="block">すべてのWiki</span>
            <span className="block text-xs opacity-80 mt-0.5">Tất cả Wiki</span>
          </button>
          <button
            onClick={() => { setActiveTab("pending"); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "pending"
                ? "bg-white shadow text-blue-700"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <span className="block">承認待ち</span>
            <span className="block text-xs opacity-80 mt-0.5">Chờ duyệt của tôi</span>
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-60 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              className="w-full text-sm outline-none"
              placeholder="記事・タグを検索... / Tìm bài viết, tag..."
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            />
          </div>
          <span className="text-[11px] text-slate-400">記事、タグで検索... / Tìm theo bài viết, tag...</span>
          <select
            value={tagFilter}
            onChange={(event) => { setTagFilter(event.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">すべてのタグ / Tất cả</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            <span className="block">{filteredArticles.length} 件</span>
            <span className="block">{filteredArticles.length} bài viết</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setCreateError("");
              setCreateSuccess("");
              setCreateOpen(true);
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span className="leading-tight">
              <span className="block">新規Wiki</span>
              <span className="block">Tạo bài viết</span>
            </span>
          </button>
        </div>
        {createSuccess ? <p className="mb-6 text-xs text-emerald-600">{createSuccess}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              <span className="block">Wikiを読み込み中...</span>
              <span className="block">Đang tải dữ liệu wiki...</span>
            </div>
          ) : error ? (
            <div className="col-span-full rounded-xl border border-dashed border-red-200 bg-white p-6 text-center text-sm text-red-500">
              {error}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              <span className="block">該当する記事がありません</span>
              <span className="block">Không có bài viết phù hợp.</span>
            </div>
          ) : (
            displayedArticles.map((item) => (
              <Link
                key={item.slug}
                href={`/wiki/${item.slug}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <p className="text-xs text-blue-600 font-semibold mb-1">
                  {item.tag}
                </p>
                <h3 className="font-semibold text-slate-800">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-2">
                  <span className="block">クリックして記事詳細を表示</span>
                  <span className="block">Nhấn để xem chi tiết nội quy/bài viết.</span>
                </p>
              </Link>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>
              ページ {page} / {totalPages} (Trang)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                前へ / Trước
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                次へ / Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className="block">Wiki記事作成</span>
                  <span className="block">Tạo bài viết Wiki</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close create wiki dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateWiki} className="space-y-3 px-4 py-4">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="記事タイトル / Tiêu đề bài viết"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                required
              />
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                placeholder="タグ（任意） / Chủ đề (không bắt buộc)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                placeholder="記事内容 / Nội dung bài viết"
                className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                required
              />
              {createError ? <p className="text-xs text-red-500">{createError}</p> : null}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  キャンセル / Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? "作成中... / Đang tạo..." : "作成 / Tạo bài viết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
