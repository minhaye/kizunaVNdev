"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type WikiArticle = {
  slug: string;
  title: string;
  tag: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:4000";

export default function WikiListPage() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  useEffect(() => {
    let active = true;

    const loadArticles = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/api/wiki`);
        const payload = await response.json();

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Không thể tải danh sách wiki");
        }

        if (!active) return;

        const mapped = Array.isArray(payload.data)
          ? payload.data.map((article: { slug?: string; title?: string; tag?: string }) => ({
              slug: article.slug ?? "",
              title: article.title ?? "",
              tag: article.tag ?? "General",
            }))
          : [];

        setArticles(mapped.filter((article) => article.slug && article.title));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Có lỗi khi tải dữ liệu wiki");
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
        return matchesQuery && matchesTag;
      }),
    [articles, normalizedQuery, tagFilter],
  );

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            文化Wiki記事一覧画面
          </h2>
          <p className="text-sm text-slate-500">
            Wiki記事一覧画面 / Màn hình DS bài viết Wiki
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-60 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              className="w-full text-sm outline-none"
              placeholder="記事・タグを検索 / Tìm theo bài viết, tag..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
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
            {filteredArticles.length} articles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Đang tải dữ liệu wiki...
            </div>
          ) : error ? (
            <div className="col-span-full rounded-xl border border-dashed border-red-200 bg-white p-6 text-center text-sm text-red-500">
              {error}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              該当する記事がありません / Không có bài viết phù hợp.
            </div>
          ) : (
            filteredArticles.map((item) => (
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
                  クリックして記事詳細を表示 / Nhấn để xem chi tiết nội quy/bài
                  viết.
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
