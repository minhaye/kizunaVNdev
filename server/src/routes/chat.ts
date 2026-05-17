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

const getRoomActorMembership = (members: ChatMemberRow[], actorEmployeeId: string | null) => {
  if (!actorEmployeeId) return null;
  return members.find((member) => member.employee_id === actorEmployeeId) ?? null;
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
  const unreadCount = actorMembership?.last_read_at
    ? visibleMessages.filter(
        (message) =>
          actorEmployeeId !== null &&
          message.sender_id !== actorEmployeeId &&
          new Date(message.sent_at).getTime() > new Date(actorMembership.last_read_at ?? "").getTime(),
      ).length
    : 0;

  const online = members.some(
    (member) => member.employee_id !== actorEmployeeId && isRecentOnline(member.employees?.last_online ?? null),
  );

  return {
    id: room.id,
    name: formatRoomName(room, members, actorEmployeeId ?? members[0]?.employee_id ?? ""),
    topic: room.topic?.trim() || (room.room_type === "direct" ? "Direct" : "Group"),
    latest: latestMessage?.content ?? "",
    latest_at: latestMessage?.sent_at ?? room.last_message_at ?? room.updated_at,
    unread: unreadCount,
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
    const unread = actorMembership?.last_read_at
      ? visibleMessages.filter(
          (message) =>
            actorEmployeeId !== null &&
            message.sender_id !== actorEmployeeId &&
            new Date(message.sent_at).getTime() > new Date(actorMembership.last_read_at ?? "").getTime(),
        ).length
      : 0;
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
        unread,
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