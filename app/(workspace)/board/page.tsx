"use client";

import { useState, useEffect } from "react";
import { Heart, ThumbsUp, Sparkles, X, Search } from "lucide-react";

type Post = {
  id: string;
  title: string;
  author: string;
  date: string;
  postedAt: string;
  avatar: string;
  content: string;
};



export default function BoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const base = (process.env.NEXT_PUBLIC_API_BASE as string) || "http://localhost:4000";
    fetch(`${base}/api/posts`)
      .then((r) => r.json())
      .then((payload) => {
        if (!mounted) return;
        if (payload?.ok && Array.isArray(payload.data)) {
          const mapped = payload.data.map((p: any) => {
            const createdAt = p.created_at || p.createdAt || "";
            let date = "";
            let postedAt = "";
            if (createdAt) {
              const d = new Date(createdAt);
              if (!Number.isNaN(d.getTime())) {
                date = d.toISOString().slice(0, 10);
                postedAt = d.toTimeString().slice(0, 5);
              }
            }
            return {
              id: p.id,
              title: p.title,
              author: p.author || p.name || "Unknown",
              date,
              postedAt,
              avatar: p.avatar || p.avatar_url || "",
              content: p.content,
            } as Post;
          });
          setPosts(mapped);
          setError(null);
        } else {
          setError("Invalid response from posts API");
        }
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeReaction, setActiveReaction] = useState<
    "like" | "love" | "insight" | null
  >(null);
  const [query, setQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState("all");
  const normalizedQuery = query.trim().toLowerCase();
  const authors = Array.from(new Set(posts.map((post) => post.author)));
  const filteredPosts = posts.filter((post) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [post.title, post.author, post.content].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    const matchesAuthor =
      authorFilter === "all" || post.author === authorFilter;
    return matchesQuery && matchesAuthor;
  });

  const reactionButtonClass = (reaction: "like" | "love" | "insight") =>
    activeReaction === reaction
      ? "flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
      : "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50";

  const openPostDetail = (post: Post) => {
    setSelectedPost(post);
    setActiveReaction(null);
  };

  return (
    <>
      <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              掲示板（コミュニティ）画面
            </h2>
            <p className="text-sm text-slate-500">
              コミュニティ掲示板画面 / Màn hình Bảng tin Cộng đồng
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 min-w-60 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="w-full text-sm outline-none"
                placeholder="タイトル・作者を検索 / Tìm theo tiêu đề, tác giả..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              value={authorFilter}
              onChange={(event) => setAuthorFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">すべての作者 / Tất cả</option>
              {authors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              {filteredPosts.length} posts
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {filteredPosts.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                該当する投稿がありません / Không có bài viết phù hợp.
              </div>
            ) : (
              filteredPosts.map((post) => (
                <button
                  key={post.title}
                  type="button"
                  onClick={() => openPostDetail(post)}
                  className="w-full text-left p-5 hover:bg-slate-50 transition-colors"
                >
                  <h3 className="font-semibold text-slate-800">{post.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {post.author} • {post.date} {post.postedAt}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 px-4 grid place-items-center"
          onClick={() => setSelectedPost(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <img
                  src={selectedPost.avatar}
                  alt={`${selectedPost.author} avatar`}
                  className="w-11 h-11 rounded-full bg-slate-200"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedPost.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedPost.author} • {selectedPost.date}{" "}
                    {selectedPost.postedAt}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                aria-label="Close popup"
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            <div className="px-5 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={reactionButtonClass("like")}
                  onClick={() =>
                    setActiveReaction((prev) =>
                      prev === "like" ? null : "like",
                    )
                  }
                >
                  <ThumbsUp size={14} /> Thích / いいね
                </button>
                <button
                  type="button"
                  className={reactionButtonClass("love")}
                  onClick={() =>
                    setActiveReaction((prev) =>
                      prev === "love" ? null : "love",
                    )
                  }
                >
                  <Heart size={14} /> Thả tim / お気に入り
                </button>
                <button
                  type="button"
                  className={reactionButtonClass("insight")}
                  onClick={() =>
                    setActiveReaction((prev) =>
                      prev === "insight" ? null : "insight",
                    )
                  }
                >
                  <Sparkles size={14} /> Hữu ích / 参考になった
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end"></div>
          </div>
        </div>
      )}
    </>
  );
}
