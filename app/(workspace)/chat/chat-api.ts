export type ChatRoomSummary = {
  id: string;
  name: string;
  topic: string;
  latest: string;
  latest_at: string;
  unread: number;
  online: boolean;
  pinned: boolean;
  room_type: "direct" | "group";
};

export type ChatMember = {
  employee_id: string;
  chat_room_id: string;
  role: "member" | "chat_admin";
  joined_at: string;
  last_read_at: string | null;
  employees?: {
    id: string;
    name: string;
    avatar_url: string | null;
    last_online: string | null;
  } | null;
};

export type ChatMessage = {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  reply_to_message_id: string | null;
  sent_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type ChatFeedback = {
  id: string;
  receiver_id: string;
  sender_id: string;
  content: string;
};

export type ChatRoomDetail = {
  id: string;
  room_type: "direct" | "group";
  name: string;
  topic: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_message_at: string | null;
  unread: number;
  pinned: boolean;
  online: boolean;
  members: ChatMember[];
  latest_message: ChatMessage | null;
  messages: ChatMessage[];
};

const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:4000";

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
};

const getStoredUser = () => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { id?: string };
  } catch {
    return null;
  }
};

const buildHeaders = () => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const buildEmployeeIdQuery = () => {
  const user = getStoredUser();
  return user?.id ? `?employee_id=${encodeURIComponent(user.id)}` : "";
};

const buildQueryString = (params: Record<string, string>) => {
  const query = new URLSearchParams();
  const employeeId = getStoredEmployeeId();

  if (employeeId) {
    query.set("employee_id", employeeId);
  }

  Object.entries(params).forEach(([key, value]) => {
    query.set(key, value);
  });

  const search = query.toString();
  return search.length > 0 ? `?${search}` : "";
};

export const fetchChatRooms = async () => {
  const response = await fetch(`${getApiBaseUrl()}/api/chat/rooms${buildEmployeeIdQuery()}`, {
    headers: buildHeaders(),
  });
  const payload = await response.json();

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to fetch chat rooms");
  }

  return payload.data as ChatRoomSummary[];
};

export const fetchChatRoomDetail = async (roomId: string) => {
  const response = await fetch(
    `${getApiBaseUrl()}/api/chat/rooms/${encodeURIComponent(roomId)}${buildEmployeeIdQuery()}`,
    {
      headers: buildHeaders(),
    },
  );
  const payload = await response.json();

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to fetch chat room detail");
  }

  return payload.data as ChatRoomDetail;
};

export const sendChatMessage = async (roomId: string, content: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/chat/rooms/${encodeURIComponent(roomId)}/messages`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      content,
      employee_id: getStoredUser()?.id,
      message_type: "text",
    }),
  });
  const payload = await response.json();

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to send message");
  }

  return payload.data as ChatMessage;
};

export const pinChatRoom = async (roomId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/chat/rooms/${encodeURIComponent(roomId)}/pin`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ employee_id: getStoredUser()?.id }),
  });
  const payload = await response.json();

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to pin chat room");
  }

  return payload;
};

export const unpinChatRoom = async (roomId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/chat/rooms/${encodeURIComponent(roomId)}/pin`, {
    method: "DELETE",
    headers: buildHeaders(),
    body: JSON.stringify({ employee_id: getStoredUser()?.id }),
  });
  const payload = await response.json();

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to unpin chat room");
  }

  return payload;
};

export const getAvatarSeed = (value: string) => {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : "User";
};

export const getAvatarClass = (value: string) => {
  const palette = [
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
    "bg-blue-100 text-blue-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
    "bg-rose-100 text-rose-700",
    "bg-emerald-100 text-emerald-700",
    "bg-slate-200 text-slate-700",
    "bg-violet-100 text-violet-700",
  ];

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return palette[hash % palette.length];
};

export const getAvatarInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const formatRoomTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  date.setHours(date.getHours() + 7);
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const getStoredEmployeeId = () => getStoredUser()?.id ?? null;

export const fetchChatFeedback = async (roomId: string, receiverId: string) => {
  const response = await fetch(
    `${getApiBaseUrl()}/api/chat/rooms/${encodeURIComponent(roomId)}/feedback${buildQueryString({
      receiver_id: receiverId,
    })}`,
    {
      headers: buildHeaders(),
    },
  );
  const payload = await response.json();

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to fetch chat feedback");
  }

  return (payload.data ?? null) as ChatFeedback | null;
};

export const saveChatFeedback = async (roomId: string, receiverId: string, content: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/chat/rooms/${encodeURIComponent(roomId)}/feedback`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      receiver_id: receiverId,
      content,
      employee_id: getStoredEmployeeId(),
    }),
  });
  const payload = await response.json();

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to save chat feedback");
  }

  return payload.data as ChatFeedback;
};