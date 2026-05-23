import type { Request, Response } from "express";
import crypto from "node:crypto";
import { env } from "../env.js";
import { supabase } from "../supabase.js";

type ChatRoomRow = {
  id: string;
  room_type: "direct" | "group";
  name: string | null;
  topic: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_message_at: string | null;
};

type ChatMemberRow = {
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

type MessageRow = {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  reply_to_message_id: string | null;
  sent_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  employees?: {
    id: string;
    name: string;
    avatar_url: string | null;
    last_online: string | null;
  } | null;
};

type FeedbackRow = {
  id: string;
  receiver_id: string;
  sender_id: string;
  content: string;
};

const firstEmployee = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const verifyToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expected) return null;

  try {
    const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadRaw) as { sub?: string; exp?: number };
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const getActorEmployeeId = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.substring(7));
    if (payload?.sub) return payload.sub;
  }

  const bodyEmployeeId = req.body?.employee_id;
  if (typeof bodyEmployeeId === "string" && bodyEmployeeId.trim().length > 0) {
    return bodyEmployeeId.trim();
  }

  const queryEmployeeId = req.query.employee_id;
  if (typeof queryEmployeeId === "string" && queryEmployeeId.trim().length > 0) {
    return queryEmployeeId.trim();
  }

  return null;
};

const isRecentOnline = (lastOnline: string | null) => {
  if (!lastOnline) return false;
  const timestamp = new Date(lastOnline).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= 5 * 60 * 1000;
};

const formatRoomName = (room: ChatRoomRow, members: ChatMemberRow[], actorEmployeeId: string) => {
  const explicitName = room.name?.trim();
  if (room.room_type === "group") {
    return explicitName && explicitName.length > 0 ? explicitName : "Group chat";
  }

  const otherMember = members.find((member) => member.employee_id !== actorEmployeeId);
  const otherName = otherMember?.employees?.name?.trim();
  if (otherName && otherName.length > 0) {
    return otherName;
  }

  return explicitName && explicitName.length > 0 ? explicitName : "Direct chat";
};

const loadPinnedRoomIds = async (actorEmployeeId: string) => {
  const { data, error } = await supabase
    .from("pinned_chats")
    .select("chat_room_id")
    .eq("pinned_by", actorEmployeeId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((item) => item.chat_room_id));
};

const loadMembershipsForRooms = async (roomIds: string[]) => {
  if (roomIds.length === 0) {
    return [] as ChatMemberRow[];
  }

  const { data, error } = await supabase
    .from("chat_members")
    .select("chat_room_id,last_read_at,role,joined_at,employees:employee_id(id,name,avatar_url,last_online)")
    .in("chat_room_id", roomIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((member) => ({
    ...member,
    employees: firstEmployee(member.employees) as ChatMemberRow["employees"],
  })) as ChatMemberRow[];
};

const loadAllRooms = async () => {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("id,room_type,name,topic,created_at,updated_at,created_by,last_message_at")
    .order("last_message_at", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ChatRoomRow[];
};

const loadRoomsByIds = async (roomIds: string[]) => {
  if (roomIds.length === 0) {
    return [] as ChatRoomRow[];
  }

  const { data, error } = await supabase
    .from("chat_rooms")
    .select("id,room_type,name,topic,created_at,updated_at,created_by,last_message_at")
    .in("id", roomIds)
    .order("last_message_at", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ChatRoomRow[];
};

const loadMessagesForRooms = async (roomIds: string[]) => {
  if (roomIds.length === 0) {
    return [] as MessageRow[];
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id,chat_room_id,sender_id,content,message_type,reply_to_message_id,sent_at,edited_at,deleted_at,employees:sender_id(id,name,avatar_url,last_online)")
    .in("chat_room_id", roomIds)
    .order("sent_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((message) => ({
    ...message,
    employees: firstEmployee(message.employees) as MessageRow["employees"],
  })) as MessageRow[];
};

const loadExistingFeedback = async (receiverId: string, senderId: string) => {
  const { data, error } = await supabase
    .from("feedbacks")
    .select("id,receiver_id,sender_id,content")
    .eq("receiver_id", receiverId)
    .eq("sender_id", senderId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] ?? null) as FeedbackRow | null;
};

const getRoomActorMembership = (members: ChatMemberRow[], actorEmployeeId: string | null) => {
  if (!actorEmployeeId) return null;
  return members.find((member) => member.employee_id === actorEmployeeId) ?? null;
};

const getLastReadTimestamp = (lastReadAt: string | null) => {
  if (!lastReadAt) return null;
  const timestamp = new Date(lastReadAt).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const buildRoomSummary = (
  room: ChatRoomRow,
  members: ChatMemberRow[],
  messages: MessageRow[],
  pinnedRoomIds: Set<string>,
  actorEmployeeId: string | null,
) => {
  const visibleMessages = messages.filter((message) => message.deleted_at === null);
  const latestMessage = visibleMessages[0] ?? null;
  const actorMembership = getRoomActorMembership(members, actorEmployeeId);
  const lastReadTimestamp = getLastReadTimestamp(actorMembership?.last_read_at ?? null);
  const unreadMessages = visibleMessages.filter((message) => {
    if (actorEmployeeId === null) return false;
    if (message.sender_id === actorEmployeeId) return false;
    const sentAt = new Date(message.sent_at).getTime();
    if (Number.isNaN(sentAt)) return false;
    return lastReadTimestamp === null ? true : sentAt > lastReadTimestamp;
  }).length;

  const online = members.some(
    (member) => member.employee_id !== actorEmployeeId && isRecentOnline(member.employees?.last_online ?? null),
  );

  return {
    id: room.id,
    name: formatRoomName(room, members, actorEmployeeId ?? members[0]?.employee_id ?? ""),
    topic: room.topic?.trim() || (room.room_type === "direct" ? "Direct" : "Group"),
    latest: latestMessage?.content ?? "",
    latest_at: latestMessage?.sent_at ?? room.last_message_at ?? room.updated_at,
    unread_messages: unreadMessages,
    unread: unreadMessages > 0 ? 1 : 0,
    online,
    pinned: pinnedRoomIds.has(room.id),
    room_type: room.room_type,
  };
};

export const listChatRoomsHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);
    if (!actorEmployeeId) {
      return res.status(401).json({ ok: false, error: "employee_id or Bearer token is required" });
    }

    const allMembershipsResult = await supabase
      .from("chat_members")
      .select("chat_room_id")
      .eq("employee_id", actorEmployeeId);

    if (allMembershipsResult.error) {
      throw new Error(allMembershipsResult.error.message);
    }

    const memberRoomIds = (allMembershipsResult.data ?? []).map(
      (membership: { chat_room_id: string }) => membership.chat_room_id,
    );

    if (memberRoomIds.length === 0) {
      return res.json({ ok: true, data: [] });
    }

    const rooms = await loadRoomsByIds(memberRoomIds);
    const [pinnedRoomIds, messages, memberships] = await Promise.all([
      loadPinnedRoomIds(actorEmployeeId),
      loadMessagesForRooms(memberRoomIds),
      loadMembershipsForRooms(memberRoomIds),
    ]);

    const messagesByRoom = new Map<string, MessageRow[]>();
    for (const message of messages) {
      const existing = messagesByRoom.get(message.chat_room_id) ?? [];
      existing.push(message);
      messagesByRoom.set(message.chat_room_id, existing);
    }

    const membershipByRoom = new Map<string, ChatMemberRow[]>();
    for (const membership of memberships) {
      const existing = membershipByRoom.get(membership.chat_room_id) ?? [];
      existing.push(membership);
      membershipByRoom.set(membership.chat_room_id, existing);
    }

    const data = rooms.map((room) =>
      buildRoomSummary(
        room,
        membershipByRoom.get(room.id) ?? [],
        messagesByRoom.get(room.id) ?? [],
        pinnedRoomIds,
        actorEmployeeId,
      ),
    );

    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getChatRoomDetailHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid chat room ID" });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("chat_members")
      .select("chat_room_id,last_read_at,role,joined_at,employees:employee_id(id,name,avatar_url,last_online)")
      .eq("employee_id", actorEmployeeId || "")
      .eq("chat_room_id", id)
      .maybeSingle<ChatMemberRow>();

    if (membershipError) {
      return res.status(500).json({ ok: false, error: membershipError.message });
    }

    if (!membership && actorEmployeeId) {
      return res.status(403).json({ ok: false, error: "You are not a member of this chat room" });
    }

    const [roomResult, membersResult, messagesResult, pinnedResult] = await Promise.all([
      supabase
        .from("chat_rooms")
        .select("id,room_type,name,topic,created_at,updated_at,created_by,last_message_at")
        .eq("id", id)
        .maybeSingle<ChatRoomRow>(),
      supabase
        .from("chat_members")
        .select("employee_id,chat_room_id,role,joined_at,last_read_at,employees:employee_id(id,name,avatar_url,last_online)")
        .eq("chat_room_id", id),
      supabase
        .from("messages")
        .select("id,chat_room_id,sender_id,content,message_type,reply_to_message_id,sent_at,edited_at,deleted_at,employees:sender_id(id,name,avatar_url,last_online)")
        .eq("chat_room_id", id)
        .order("sent_at", { ascending: false }),
      actorEmployeeId
        ? supabase
            .from("pinned_chats")
            .select("chat_room_id")
            .eq("pinned_by", actorEmployeeId)
            .eq("chat_room_id", id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (roomResult.error) {
      return res.status(500).json({ ok: false, error: roomResult.error.message });
    }

    if (!roomResult.data) {
      return res.status(404).json({ ok: false, error: "Chat room not found" });
    }

    if (membersResult.error) {
      return res.status(500).json({ ok: false, error: membersResult.error.message });
    }

    if (messagesResult.error) {
      return res.status(500).json({ ok: false, error: messagesResult.error.message });
    }

    const room = roomResult.data;
    const members = (membersResult.data ?? []).map((member) => ({
      ...member,
      employees: firstEmployee(member.employees) as ChatMemberRow["employees"],
    })) as ChatMemberRow[];
    const messages = (messagesResult.data ?? []).map((message) => ({
      ...message,
      employees: firstEmployee(message.employees) as MessageRow["employees"],
    })) as MessageRow[];
    const visibleMessages = messages.filter((message) => message.deleted_at === null);
    const latestMessage = visibleMessages[0] ?? null;
    const roomName = formatRoomName(room, members, actorEmployeeId ?? members[0]?.employee_id ?? "");
    const actorMembership = getRoomActorMembership(members, actorEmployeeId);
    const lastReadTimestamp = getLastReadTimestamp(actorMembership?.last_read_at ?? null);
    const unreadMessages = visibleMessages.filter((message) => {
      if (!actorEmployeeId) return false;
      if (message.sender_id === actorEmployeeId) return false;
      const sentAt = new Date(message.sent_at).getTime();
      if (Number.isNaN(sentAt)) return false;
      return lastReadTimestamp === null ? true : sentAt > lastReadTimestamp;
    }).length;
    const online = members.some(
      (member) => member.employee_id !== actorEmployeeId && isRecentOnline(member.employees?.last_online ?? null),
    );

    if (actorMembership && actorMembership.last_read_at !== room.last_message_at) {
      await supabase
        .from("chat_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("employee_id", actorEmployeeId)
        .eq("chat_room_id", id);
    }

    return res.json({
      ok: true,
      data: {
        id: room.id,
        room_type: room.room_type,
        name: roomName,
        topic: room.topic?.trim() || (room.room_type === "direct" ? "Direct" : "Group"),
        created_at: room.created_at,
        updated_at: room.updated_at,
        created_by: room.created_by,
        last_message_at: room.last_message_at,
        unread_messages: unreadMessages,
        unread: unreadMessages > 0 ? 1 : 0,
        pinned: Boolean(pinnedResult.data),
        online,
        members,
        latest_message: latestMessage,
        messages: visibleMessages.reverse(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const createChatMessageHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);
    if (!actorEmployeeId) {
      return res.status(401).json({ ok: false, error: "employee_id or Bearer token is required" });
    }

    const { id } = req.params;
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    const messageType = typeof req.body?.message_type === "string" ? req.body.message_type : "text";

    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid chat room ID" });
    }

    if (!content) {
      return res.status(400).json({ ok: false, error: "content is required" });
    }

    if (!["text", "image", "file", "system"].includes(messageType)) {
      return res.status(400).json({ ok: false, error: "Invalid message_type" });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("chat_members")
      .select("employee_id,chat_room_id")
      .eq("employee_id", actorEmployeeId)
      .eq("chat_room_id", id)
      .maybeSingle();

    if (membershipError) {
      return res.status(500).json({ ok: false, error: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ ok: false, error: "You are not a member of this chat room" });
    }

    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (roomError) {
      return res.status(500).json({ ok: false, error: roomError.message });
    }

    if (!room) {
      return res.status(404).json({ ok: false, error: "Chat room not found" });
    }

    const sentAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_room_id: id,
        sender_id: actorEmployeeId,
        content,
        message_type: messageType,
        sent_at: sentAt,
      })
      .select("id,chat_room_id,sender_id,content,message_type,reply_to_message_id,sent_at,edited_at,deleted_at")
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    await Promise.all([
      supabase
        .from("chat_rooms")
        .update({ last_message_at: sentAt, updated_at: sentAt })
        .eq("id", id),
      supabase
        .from("chat_members")
        .update({ last_read_at: sentAt })
        .eq("employee_id", actorEmployeeId)
        .eq("chat_room_id", id),
    ]);

    return res.status(201).json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const pinChatRoomHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);
    if (!actorEmployeeId) {
      return res.status(401).json({ ok: false, error: "employee_id or Bearer token is required" });
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid chat room ID" });
    }

    const { error } = await supabase
      .from("pinned_chats")
      .upsert(
        {
          chat_room_id: id,
          pinned_by: actorEmployeeId,
          pinned_at: new Date().toISOString(),
        },
        { onConflict: "chat_room_id,pinned_by" },
      );

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, action: "pinned" });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const unpinChatRoomHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);
    if (!actorEmployeeId) {
      return res.status(401).json({ ok: false, error: "employee_id or Bearer token is required" });
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid chat room ID" });
    }

    const { error } = await supabase
      .from("pinned_chats")
      .delete()
      .eq("chat_room_id", id)
      .eq("pinned_by", actorEmployeeId);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, action: "unpinned" });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getChatFeedbackHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);
    if (!actorEmployeeId) {
      return res.status(401).json({ ok: false, error: "employee_id or Bearer token is required" });
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid chat room ID" });
    }

    const receiverId = typeof req.query.receiver_id === "string" ? req.query.receiver_id.trim() : "";
    if (!receiverId) {
      return res.status(400).json({ ok: false, error: "receiver_id is required" });
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("chat_members")
      .select("employee_id")
      .eq("chat_room_id", id)
      .in("employee_id", [actorEmployeeId, receiverId]);

    if (membershipError) {
      return res.status(500).json({ ok: false, error: membershipError.message });
    }

    const memberIds = new Set((memberships ?? []).map((membership: { employee_id: string }) => membership.employee_id));
    if (!memberIds.has(actorEmployeeId)) {
      return res.status(403).json({ ok: false, error: "You are not a member of this chat room" });
    }

    if (!memberIds.has(receiverId)) {
      return res.status(404).json({ ok: false, error: "Feedback target is not in this chat room" });
    }

    const feedback = await loadExistingFeedback(receiverId, actorEmployeeId);

    return res.json({
      ok: true,
      data: feedback,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const saveChatFeedbackHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);
    if (!actorEmployeeId) {
      return res.status(401).json({ ok: false, error: "employee_id or Bearer token is required" });
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid chat room ID" });
    }

    const receiverId = typeof req.body?.receiver_id === "string" ? req.body.receiver_id.trim() : "";
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (!receiverId) {
      return res.status(400).json({ ok: false, error: "receiver_id is required" });
    }

    if (!content) {
      return res.status(400).json({ ok: false, error: "content is required" });
    }

    if (receiverId === actorEmployeeId) {
      return res.status(400).json({ ok: false, error: "Cannot leave feedback for yourself" });
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("chat_members")
      .select("employee_id")
      .eq("chat_room_id", id)
      .in("employee_id", [actorEmployeeId, receiverId]);

    if (membershipError) {
      return res.status(500).json({ ok: false, error: membershipError.message });
    }

    const memberIds = new Set((memberships ?? []).map((membership: { employee_id: string }) => membership.employee_id));
    if (!memberIds.has(actorEmployeeId)) {
      return res.status(403).json({ ok: false, error: "You are not a member of this chat room" });
    }

    if (!memberIds.has(receiverId)) {
      return res.status(404).json({ ok: false, error: "Feedback target is not in this chat room" });
    }

    const existingFeedback = await loadExistingFeedback(receiverId, actorEmployeeId);
    const payload = {
      receiver_id: receiverId,
      sender_id: actorEmployeeId,
      content,
    };

    if (existingFeedback) {
      const { data, error } = await supabase
        .from("feedbacks")
        .update({ content })
        .eq("id", existingFeedback.id)
        .select("id,receiver_id,sender_id,content")
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.json({
        ok: true,
        action: "updated",
        data,
      });
    }

    const { data, error } = await supabase
      .from("feedbacks")
      .insert(payload)
      .select("id,receiver_id,sender_id,content")
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({
      ok: true,
      action: "created",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

const normalizeMemberIds = (memberIds: unknown[]) => {
  const unique = new Set<string>();
  for (const value of memberIds) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) unique.add(trimmed);
    }
  }
  return Array.from(unique);
};

const findExistingDirectRoom = async (actorEmployeeId: string, otherEmployeeId: string) => {
  const [actorRoomsResult, otherRoomsResult] = await Promise.all([
    supabase.from("chat_members").select("chat_room_id").eq("employee_id", actorEmployeeId),
    supabase.from("chat_members").select("chat_room_id").eq("employee_id", otherEmployeeId),
  ]);

  if (actorRoomsResult.error) {
    throw new Error(actorRoomsResult.error.message);
  }

  if (otherRoomsResult.error) {
    throw new Error(otherRoomsResult.error.message);
  }

  const actorRoomIds = new Set(
    (actorRoomsResult.data ?? []).map((membership: { chat_room_id: string }) => membership.chat_room_id),
  );

  const sharedRoomIds = (otherRoomsResult.data ?? [])
    .map((membership: { chat_room_id: string }) => membership.chat_room_id)
    .filter((id) => actorRoomIds.has(id));

  if (sharedRoomIds.length === 0) {
    return null;
  }

  const rooms = await loadRoomsByIds(sharedRoomIds);
  return rooms.find((room) => room.room_type === "direct") ?? null;
};

export const createChatRoomHandler = async (req: Request, res: Response) => {
  try {
    const actorEmployeeId = getActorEmployeeId(req);
    if (!actorEmployeeId) {
      return res.status(401).json({ ok: false, error: "employee_id or Bearer token is required" });
    }

    const roomType = req.body?.room_type === "direct" ? "direct" : "group";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
    const requestedMemberIds = normalizeMemberIds(
      Array.isArray(req.body?.member_ids) ? req.body.member_ids : [],
    ).filter((id) => id !== actorEmployeeId);

    const memberIds = normalizeMemberIds([actorEmployeeId, ...requestedMemberIds]);

    if (roomType === "direct") {
      const otherMemberId = requestedMemberIds.find((id) => id !== actorEmployeeId) ?? "";
      if (!otherMemberId || requestedMemberIds.length !== 1) {
        return res
          .status(400)
          .json({ ok: false, error: "direct chat requires exactly 1 other member" });
      }

      const existing = await findExistingDirectRoom(actorEmployeeId, otherMemberId);
      if (existing) {
        return res.json({ ok: true, action: "existing", data: { id: existing.id, room_type: "direct" } });
      }
    }

    if (roomType === "group" && memberIds.length < 2) {
      return res.status(400).json({ ok: false, error: "group chat requires at least 2 members" });
    }

    const timestamp = new Date().toISOString();
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .insert({
        room_type: roomType,
        name: roomType === "group" ? (name.length > 0 ? name : null) : null,
        topic: topic.length > 0 ? topic : null,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: actorEmployeeId,
      })
      .select("id,room_type,name,topic,created_at,updated_at,created_by,last_message_at")
      .single();

    if (roomError) {
      return res.status(500).json({ ok: false, error: roomError.message });
    }

    const membersPayload = memberIds.map((memberId) => ({
      employee_id: memberId,
      chat_room_id: room.id,
      role: memberId === actorEmployeeId ? "chat_admin" : "member",
      joined_at: timestamp,
      last_read_at: null,
    }));

    const { error: memberError } = await supabase.from("chat_members").insert(membersPayload);
    if (memberError) {
      return res.status(500).json({ ok: false, error: memberError.message });
    }

    return res.status(201).json({ ok: true, action: "created", data: room });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};