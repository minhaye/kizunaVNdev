"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Avatar from "../../components/avatar";
import { Heart, ThumbsUp, Sparkles, X, Search, Plus } from "lucide-react";

type Post = {
  id: string;
  title: string;
  author: string;
  date: string;
  postedAt: string;
  avatar: string;
  content: string;
  status?: string;
};

type ReactionType = "like" | "heart" | "useful";

type ReactionSummary = {
  counts: Record<ReactionType, number>;
  myReaction: {
    id: string;
    employee_id: string;
    reaction_type: ReactionType;
  } | null;
};

const reactionMeta: Record<
  ReactionType,
  { label: string; icon: typeof ThumbsUp }
> = {
  like: { label: "Thích / いいね", icon: ThumbsUp },
  heart: { label: "Thả tim / お気に入り", icon: Heart },
  useful: { label: "Hữu ích / 参考になった", icon: Sparkles },
};

const apiBase =
  (process.env.NEXT_PUBLIC_API_BASE as string) || "http://localhost:4000";

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
};



function BoardContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"published" | "pending">("published");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const searchParams = useSearchParams();

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const headers: HeadersInit = {};
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    fetch(`${apiBase}/api/posts`, { headers })
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
              author: p.author || p.name || "不明 / Không rõ",
              date,
              postedAt,
              avatar: p.avatar || p.avatar_url || "",
              content: p.content,
              status: p.status || "published",
            } as Post;
          });
          setPosts(mapped);
          setError(null);
        } else {
          setError("掲示板APIの応答が不正です / Phản hồi API bảng tin không hợp lệ");
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
  const [selectedPostReactions, setSelectedPostReactions] = useState<ReactionSummary | null>(null);
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
    const matchesTab = activeTab === "published" ? post.status !== "pending" : post.status === "pending";
    return matchesQuery && matchesAuthor && matchesTab;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const displayedPosts = filteredPosts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const reactionButtonClass = (reaction: ReactionType) =>
    selectedPostReactions?.myReaction?.reaction_type === reaction
      ? "flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
      : "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50";

  const fetchPostReactions = async (postId: string) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBase}/api/posts/${postId}/reactions`, {
      headers,
    });
    const payload = await response.json();

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "リアクションを取得できません / Không thể tải reaction");
    }

    setSelectedPostReactions(payload.data);
  };

  const openPostDetail = async (post: Post) => {
    setSelectedPost(post);
    setSelectedPostReactions(null);
    setDetailLoading(true);
    try {
      await fetchPostReactions(post.id);
    } catch (fetchError) {
      console.error(fetchError);
      setSelectedPostReactions({
        counts: { like: 0, heart: 0, useful: 0 },
        myReaction: null,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !posts.length) return;
    const postId = searchParams?.get("postId");
    if (!postId) return;
    const matched = posts.find((post) => post.id === postId);
    if (matched) {
      void openPostDetail(matched);
    }
  }, [loading, posts, searchParams]);

  const submitReaction = async (reactionType: ReactionType) => {
    if (!selectedPost) return;

    const currentReaction = selectedPostReactions?.myReaction?.reaction_type ?? null;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const endpoint = `${apiBase}/api/posts/${selectedPost.id}/reactions`;

    try {
      let response: Response;

      if (currentReaction === reactionType) {
        response = await fetch(endpoint, {
          method: "DELETE",
          headers,
          body: JSON.stringify({}),
        });
      } else {
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ reaction_type: reactionType }),
        });
      }

      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "リアクションを更新できません / Không thể cập nhật reaction");
      }

      await fetchPostReactions(selectedPost.id);
    } catch (reactionError) {
      console.error(reactionError);
      alert(reactionError instanceof Error ? reactionError.message : "リアクションに失敗しました / Có lỗi khi thả reaction");
    }
  };

  const createCommunityPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setCreating(true);
    try {
      const token = getAuthToken();
      const rawUser = localStorage.getItem("user");
      const user = rawUser ? (JSON.parse(rawUser) as { id?: string }) : null;
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBase}/api/posts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newTitle,
          topic: newTopic,
          content: newContent,
          employee_id: user?.id,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to create post");
      }

      const p = payload.data as {
        id: string;
        title: string;
        author: string;
        avatar: string;
        content: string;
        created_at: string;
      };
      const createdDate = new Date(p.created_at);
      const mappedPost: Post = {
        id: p.id,
        title: p.title,
        author: p.author || "Unknown",
        date: Number.isNaN(createdDate.getTime()) ? "" : createdDate.toISOString().slice(0, 10),
        postedAt: Number.isNaN(createdDate.getTime()) ? "" : createdDate.toTimeString().slice(0, 5),
        avatar: p.avatar || "",
        content: p.content,
        status: p.status || "pending",
      };

      setPosts((prev) => [mappedPost, ...prev]);
      setNewTitle("");
      setNewTopic("");
      setNewContent("");
      setActiveTab("pending");
      setCreateSuccess("コミュニティ投稿を作成しました。管理者の承認待ちです / Đăng bài cộng đồng thành công. Bài viết đang chờ admin duyệt.");
      setCreateOpen(false);
    } catch (submitError) {
      setCreateError(submitError instanceof Error ? submitError.message : "投稿エラーが発生しました / Có lỗi khi đăng bài");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              <span className="block">掲示板（コミュニティ）画面</span>
              <span className="block">Màn hình Bảng tin Cộng đồng</span>
            </h2>
            <p className="text-sm text-slate-500">
              <span className="block">コミュニティ掲示板画面</span>
              <span className="block">Màn hình Bảng tin Cộng đồng</span>
            </p>
          </div>

          <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 mb-4 w-fit">
            <button
              onClick={() => { setActiveTab("published"); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === "published"
                  ? "bg-white shadow text-blue-700"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <span className="block">すべての投稿</span>
              <span className="block text-xs opacity-80 mt-0.5">Tất cả bài viết</span>
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
                placeholder="タイトル・作者を検索... / Tìm tiêu đề, tác giả..."
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              />
            </div>
            <span className="text-[11px] text-slate-400">タイトル、作者で検索... / Tìm theo tiêu đề, tác giả...</span>
            <select
              value={authorFilter}
              onChange={(event) => { setAuthorFilter(event.target.value); setPage(1); }}
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
              <span className="block">{filteredPosts.length} 件</span>
              <span className="block">{filteredPosts.length} bài viết</span>
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
                <span className="block">新規投稿</span>
                <span className="block">Tạo bài viết</span>
              </span>
            </button>
          </div>
          {createSuccess ? <p className="mb-6 text-xs text-emerald-600">{createSuccess}</p> : null}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {filteredPosts.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                <span className="block">該当する投稿がありません</span>
                <span className="block">Không có bài viết phù hợp.</span>
              </div>
            ) : (
              displayedPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                    onClick={() => void openPostDetail(post)}
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
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
                <Avatar
                  name={selectedPost.author}
                  src={selectedPost.avatar}
                  className="w-11 h-11"
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
                aria-label="閉じる / Đóng"
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            <div className="px-5 pb-5">
              <div className="mb-3 text-xs text-slate-500">
                {detailLoading ? (
                  <>
                    <span className="block">リアクションを読み込み中...</span>
                    <span className="block">Đang tải reaction...</span>
                  </>
                ) : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(reactionMeta) as ReactionType[]).map((reaction) => {
                  const meta = reactionMeta[reaction];
                  const Icon = meta.icon;
                  const count = selectedPostReactions?.counts?.[reaction] ?? 0;
                  const [vi, ja] = meta.label.split(" / ");
                  return (
                    <button
                      key={reaction}
                      type="button"
                      className={reactionButtonClass(reaction)}
                      onClick={() => void submitReaction(reaction)}
                    >
                      <Icon size={14} />
                      <span className="leading-tight">
                        <span className="block">{ja ?? meta.label}</span>
                        <span className="block">{vi ?? meta.label}</span>
                      </span>
                      <span>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <span className="block">閉じる</span>
                <span className="block">Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">
                <span className="block">コミュニティ投稿作成</span>
                <span className="block">Tạo bài viết cộng đồng</span>
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close create post dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={createCommunityPost} className="space-y-3 px-4 py-4">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="記事タイトル / Tiêu đề bài viết"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                required
              />
              <input
                value={newTopic}
                onChange={(event) => setNewTopic(event.target.value)}
                placeholder="トピック（任意） / Chủ đề (không bắt buộc)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                placeholder="投稿内容 / Nội dung bài viết"
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
                  {creating ? "投稿中... / Đang đăng..." : "投稿する / Đăng bài"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BoardContent />
    </Suspense>
  );
}
