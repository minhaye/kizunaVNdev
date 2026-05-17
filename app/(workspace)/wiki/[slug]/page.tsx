"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type WikiArticleDetail = {
  slug: string;
  title: string;
  content: string;
  tag: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:4000";

export default function WikiDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [article, setArticle] = useState<WikiArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("Thiếu mã bài viết");
      return;
    }

    let active = true;

    const loadArticle = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/api/wiki/${encodeURIComponent(slug)}`);
        const payload = await response.json();

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Không thể tải chi tiết bài viết");
        }

        if (!active) return;

        setArticle({
          slug: payload.data?.slug ?? slug,
          title: payload.data?.title ?? "",
          content: payload.data?.content ?? "",
          tag: payload.data?.tag ?? "General",
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Có lỗi khi tải bài viết");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadArticle();

    return () => {
      active = false;
    };
  }, [slug]);

  const contentLines = useMemo(() => {
    const source = article?.content?.trim() ?? "";
    if (!source) return [];

    return source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [article?.content]);

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <article className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <p className="text-xs text-slate-500">記事・ルール詳細画面 / {article?.slug ?? slug ?? "-"}</p>
        <h2 className="text-xl font-bold text-slate-900 mt-2">{article?.title ?? "Wiki Article"}</h2>
        {article?.tag ? <p className="text-xs text-blue-600 font-semibold mt-2">{article.tag}</p> : null}
        <div className="mt-4 space-y-3 text-sm text-slate-700 leading-6">
          {loading ? <p>Đang tải nội dung bài viết...</p> : null}
          {!loading && error ? <p className="text-red-500">{error}</p> : null}
          {!loading && !error && contentLines.length === 0 ? <p>Chưa có nội dung bài viết.</p> : null}
          {!loading && !error && contentLines.length > 0
            ? contentLines.map((line, index) => <p key={`${index}-${line.slice(0, 20)}`}>{line}</p>)
            : null}
        </div>
      </article>
    </main>
  );
}
