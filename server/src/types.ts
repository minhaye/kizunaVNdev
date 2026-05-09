export type Role = "staff" | "admin";

export type Post = {
  id: string;
  topic?: string;
  title: string;
  author: string;
  avatar: string;
  content: string;
  created_by: string;
  created_at: string;
  reactions?: Array<{
    id: string;
    employee_id: string;
    reaction_type: "like" | "heart" | "useful";
  }>;
};
