export type Role = "staff" | "admin";

export type PostStatus = "pending" | "approved" | "rejected";

export type Post = {
  id: string;
  topic?: string;
  title: string;
  author: string;
  avatar: string;
  content: string;
  created_by: string;
  created_at: string;
  status: PostStatus;
  reviewed_by?: string | null;
  reviewed_by_admin?: string | null;
  reviewed_at?: string | null;
  reactions?: Array<{
    id: string;
    employee_id: string;
    reaction_type: "like" | "heart" | "useful";
  }>;
  reaction_counts?: {
    like: number;
    heart: number;
    useful: number;
  };
};

export type WikiArticleStatus = "pending" | "approved" | "rejected";

export type WikiArticle = {
  id: string;
  slug: string;
  tag: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  status: WikiArticleStatus;
  reviewed_by?: string | null;
  reviewed_by_admin?: string | null;
  reviewed_at?: string | null;
};

export type ReactionType = "like" | "heart" | "useful";
