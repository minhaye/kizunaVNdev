"use client";

import { useState } from "react";
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

const posts: Post[] = [
  {
    id: "post-001",
    title: "4/30〜5/1 休業のお知らせ",
    author: "Admin",
    date: "2026-04-20",
    postedAt: "09:15",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=dbeafe",
    content:
      "4/30 (木) 18:00 から 5/1 (金) 終日まで社内システムの定期停止を実施します。緊急対応が必要な場合は総務チームまでご連絡ください。",
  },
  {
    id: "post-002",
    title: "社内交流イベントのお知らせ",
    author: "HR",
    date: "2026-04-18",
    postedAt: "14:20",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=HR&backgroundColor=ede9fe",
    content:
      "今月末に社内交流イベントを開催します。会場は 7F ラウンジ、開始は 18:30 です。参加希望者は水曜日までにフォーム入力をお願いします。",
  },
  {
    id: "post-003",
    title: "新しいWiki記事を公開しました",
    author: "Content Team",
    date: "2026-04-17",
    postedAt: "11:05",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=ContentTeam&backgroundColor=fef3c7",
    content:
      "文化Wikiに『日本のビジネスマナー基礎』記事を公開しました。会議マナー、メール敬語、報連相の実例を追加しています。",
  },
  {
    id: "post-004",
    title: "翻訳品質レビュー会のお知らせ",
    author: "QA",
    date: "2026-04-16",
    postedAt: "16:40",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=QA&backgroundColor=d1fae5",
    content:
      "今週金曜日 16:00 から翻訳品質レビュー会を実施します。対象は先週提出分の案件です。各担当者はレビューコメントを事前に確認してください。",
  },
  {
    id: "post-005",
    title: "来週の全体朝会アジェンダ",
    author: "PMO",
    date: "2026-04-15",
    postedAt: "08:55",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=PMO&backgroundColor=fee2e2",
    content:
      "来週の朝会ではQ2目標進捗、プロジェクト別の課題共有、新メンバー紹介を予定しています。発表担当は資料を前日までに提出してください。",
  },
  {
    id: "post-006",
    title: "Taskテンプレート v2 配布",
    author: "Admin",
    date: "2026-04-14",
    postedAt: "10:10",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=AdminV2&backgroundColor=dbeafe",
    content:
      "Task管理テンプレート v2 を配布しました。優先度定義の更新と期限アラート欄を追加しています。既存テンプレートは今週中に切り替えをお願いします。",
  },
  {
    id: "post-007",
    title: "VPNメンテナンス計画",
    author: "Infra",
    date: "2026-04-13",
    postedAt: "19:30",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Infra&backgroundColor=e0f2fe",
    content:
      "日曜日 01:00〜03:00 にVPNメンテナンスを実施します。作業中は断続的に接続が切れる可能性があります。重要作業は時間外に調整してください。",
  },
  {
    id: "post-008",
    title: "新人向け日本語ガイド更新",
    author: "Training",
    date: "2026-04-12",
    postedAt: "13:25",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Training&backgroundColor=fce7f3",
    content:
      "新人向け日本語ガイドを更新し、社内チャットでよく使う表現集を追加しました。オンボーディング資料から最新版へアクセスできます。",
  },
];

export default function BoardPage() {
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
