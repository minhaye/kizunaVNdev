"use client";

import {
  ArrowLeft,
  Info,
  Phone,
  SendHorizontal,
  Smile,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  fetchChatRoomDetail,
  formatRoomTime,
  getAvatarClass,
  getAvatarInitials,
  getAvatarSeed,
  getStoredEmployeeId,
  sendChatMessage,
  type ChatRoomDetail,
} from "../chat-api";

type TranslationEntry = {
  status: "idle" | "loading" | "ready" | "error";
  translated?: string;
  detected?: "ja" | "vi";
  target?: "ja" | "vi";
  error?: string;
};

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const roomId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [room, setRoom] = useState<ChatRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [translations, setTranslations] = useState<Record<string, TranslationEntry>>({});
  const actorEmployeeId = useMemo(() => getStoredEmployeeId(), []);

  useEffect(() => {
    if (!roomId) {
      setError("Invalid chat room ID");
      setLoading(false);
      return;
    }

    let active = true;

    const loadRoom = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchChatRoomDetail(roomId);
        if (!active) return;
        setRoom(data);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load chat room");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRoom();

    return () => {
      active = false;
    };
  }, [roomId]);

  const handleSend = async () => {
    if (!roomId || !draft.trim()) return;

    try {
      setSending(true);
      await sendChatMessage(roomId, draft.trim());
      setDraft("");
      const refreshed = await fetchChatRoomDetail(roomId);
      setRoom(refreshed);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTranslate = async (messageId: string, text: string) => {
    const current = translations[messageId];
    setTranslations((prev) => ({
      ...prev,
      [messageId]: { status: "loading" },
    }));

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to translate message");
      }

      setTranslations((prev) => ({
        ...prev,
        [messageId]: {
          status: "ready",
          translated: payload.data.translated as string,
          detected: payload.data.detected_language as "ja" | "vi",
          target: payload.data.target_language as "ja" | "vi",
        },
      }));
    } catch (translateError) {
      setTranslations((prev) => ({
        ...prev,
        [messageId]: {
          status: "error",
          error: translateError instanceof Error ? translateError.message : "Failed to translate",
        },
      }));
    }
  };

  const roomName = room?.name ?? roomId ?? "Chat";
  const roomTopic = room?.topic ?? "";
  const isRecentOnline = (value: string | null | undefined) => {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= 5 * 60 * 1000;
  };

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-170 flex flex-col overflow-hidden">
          <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-white to-blue-50/40">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/chat"
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </Link>
              <div
                className={`relative w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarClass(getAvatarSeed(roomName))}`}
              >
                {getAvatarInitials(roomName)}
                <span
                  className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-white ${room?.online ? "bg-emerald-500" : "bg-amber-400"}`}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {roomName}
                </h2>
                {room?.room_type !== "group" && (
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${room?.online ? "bg-emerald-500" : "bg-amber-400"}`} />
                    {room?.online ? "Online" : "Offline"}
                  </p>
                )}
                {roomTopic && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{roomTopic}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                <Phone className="w-4 h-4 text-slate-600" />
              </button>
              <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                <Video className="w-4 h-4 text-slate-600" />
              </button>
              <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                <Info className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </header>

          {room?.room_type === "group" && room.members.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2 overflow-x-auto">
                {room.members.map((member) => {
                  const memberName = member.employees?.name ?? "Unknown";
                  const memberOnline = isRecentOnline(member.employees?.last_online);

                  return (
                    <div key={member.employee_id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 shrink-0">
                      <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarClass(getAvatarSeed(memberName))}`}>
                        {getAvatarInitials(memberName)}
                        <span className={`absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full border-2 border-white ${memberOnline ? "bg-emerald-500" : "bg-amber-400"}`} />
                      </div>
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                        {memberName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 p-5 space-y-4 bg-slate-50/40">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Đang tải hội thoại...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-dashed border-red-200 bg-white px-4 py-6 text-center text-sm text-red-500">
                {error}
              </div>
            ) : room?.messages.length ? (
              room.messages.map((message) => {
                const mine = message.sender_id === actorEmployeeId;
                const sender = room.members.find((member) => member.employee_id === message.sender_id);
                const senderName = sender?.employees?.name ?? "Unknown";
                const translation = translations[message.id];

                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "items-end gap-2"}`}>
                    {!mine && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarClass(getAvatarSeed(senderName))}`}
                      >
                        {getAvatarInitials(senderName)}
                      </div>
                    )}
                    <div
                      className={`chat-bubble max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${mine ? "chat-bubble-mine rounded-tr-md bg-blue-600 text-white" : "chat-bubble-other rounded-tl-md bg-white border border-slate-200 text-slate-700"}`}
                    >
                      {!mine && (
                        <p className="mb-1 text-[11px] font-semibold text-slate-400">
                          {senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {translation?.status === "ready" && translation.translated && (
                        <div className="mt-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2">
                          <p className="text-[10px] font-semibold text-slate-400">
                            翻訳 / Dịch
                          </p>
                          <p className="whitespace-pre-wrap text-[13px] text-slate-700">
                            {translation.translated}
                          </p>
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          className={`text-[10px] font-semibold ${mine ? "text-blue-100" : "text-slate-400"} hover:underline disabled:opacity-60`}
                          onClick={() => void handleTranslate(message.id, message.content)}
                          disabled={translation?.status === "loading"}
                        >
                          {translation?.status === "loading"
                            ? "翻訳中... / Đang dịch..."
                            : translation?.status === "ready"
                              ? "翻訳済み / Đã dịch"
                              : "翻訳 / Dịch"}
                        </button>
                        <p className={`text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
                          {formatRoomTime(message.sent_at)}
                        </p>
                      </div>
                      {translation?.status === "error" && (
                        <p className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-red-400"}`}>
                          {translation.error}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Chưa có tin nhắn nào.
              </div>
            )}
          </div>

          <footer className="border-t border-slate-100 p-4 bg-white">
            <div className="rounded-2xl border border-slate-200 px-3 py-2 flex items-start gap-2 bg-slate-50">
              <button className="mt-1 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <Smile className="w-4 h-4 text-slate-500" />
              </button>
              <textarea
                className="w-full resize-none bg-transparent text-sm text-slate-800 outline-none py-2"
                rows={2}
                placeholder="送信内容を入力... / Nhập nội dung cần gửi..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <button
                className="self-end inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shrink-0 disabled:opacity-60"
                disabled={sending || draft.trim().length === 0}
                onClick={() => void handleSend()}
              >
                <SendHorizontal className="w-4 h-4" /> 送信 / Gửi
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 px-1">
              送信時にAI翻訳とトーン提案を適用 / AI dịch và gợi ý sắc thái sẽ áp
              dụng khi gửi.
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}
