"use client";

import {
  ArrowLeft,
  Info,
  SendHorizontal,
  Smile,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  fetchChatFeedback,
  fetchChatRoomDetail,
  formatRoomTime,
  getAvatarClass,
  getAvatarInitials,
  getAvatarSeed,
  getStoredEmployeeId,
  saveChatFeedback,
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackTargetId, setFeedbackTargetId] = useState("");
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

  const feedbackTargets = useMemo(
    () => room?.members.filter((member) => member.employee_id !== actorEmployeeId) ?? [],
    [room, actorEmployeeId],
  );

  const selectedFeedbackTarget = useMemo(
    () => feedbackTargets.find((member) => member.employee_id === feedbackTargetId) ?? feedbackTargets[0] ?? null,
    [feedbackTargets, feedbackTargetId],
  );

  useEffect(() => {
    if (!feedbackOpen) {
      return;
    }

    if (feedbackTargets.length === 0) {
      setFeedbackTargetId("");
      setFeedbackDraft("");
      setFeedbackError("Không có thành viên nào để feedback.");
      return;
    }

    if (!feedbackTargetId || !feedbackTargets.some((member) => member.employee_id === feedbackTargetId)) {
      setFeedbackTargetId(feedbackTargets[0].employee_id);
    }
  }, [feedbackOpen, feedbackTargetId, feedbackTargets]);

  useEffect(() => {
    if (!feedbackOpen || !roomId || !selectedFeedbackTarget || !actorEmployeeId) {
      return;
    }

    let active = true;

    const loadFeedback = async () => {
      try {
        setFeedbackLoading(true);
        setFeedbackError("");
        const currentFeedback = await fetchChatFeedback(roomId, selectedFeedbackTarget.employee_id);
        if (!active) return;
        setFeedbackDraft(currentFeedback?.content ?? "");
      } catch (loadError) {
        if (!active) return;
        setFeedbackError(loadError instanceof Error ? loadError.message : "Failed to load feedback");
      } finally {
        if (active) setFeedbackLoading(false);
      }
    };

    void loadFeedback();

    return () => {
      active = false;
    };
  }, [actorEmployeeId, feedbackOpen, roomId, selectedFeedbackTarget?.employee_id]);

  const handleOpenFeedback = () => {
    setFeedbackError("");
    setFeedbackOpen(true);
  };

  const handleSaveFeedback = async () => {
    if (!roomId || !selectedFeedbackTarget) {
      return;
    }

    try {
      setFeedbackSaving(true);
      setFeedbackError("");
      await saveChatFeedback(roomId, selectedFeedbackTarget.employee_id, feedbackDraft.trim());
      setFeedbackOpen(false);
      setFeedbackDraft("");
    } catch (saveError) {
      setFeedbackError(saveError instanceof Error ? saveError.message : "Failed to save feedback");
    } finally {
      setFeedbackSaving(false);
    }
  };

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
                {room?.online && (
                  <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {roomName}
                </h2>
                <p className="text-xs text-emerald-600 font-medium">
                  {room?.online ? "オンライン中 / Đang hoạt động" : "オフライン / Offline"}
                </p>
                {roomTopic && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{roomTopic}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenFeedback}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label="Open feedback dialog"
              >
                <Info className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </header>

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
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${mine ? "rounded-tr-md bg-blue-600 text-white" : "rounded-tl-md bg-white border border-slate-200 text-slate-700"}`}
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

      {feedbackOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Gửi feedback</p>
                <p className="text-xs text-slate-500">
                  {selectedFeedbackTarget
                    ? `Đánh giá ${selectedFeedbackTarget.employees?.name ?? "người này"}`
                    : "Chọn người nhận feedback"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close feedback dialog"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              {feedbackTargets.length > 1 && (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Người nhận</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={selectedFeedbackTarget?.employee_id ?? ""}
                    onChange={(event) => setFeedbackTargetId(event.target.value)}
                  >
                    {feedbackTargets.map((member) => (
                      <option key={member.employee_id} value={member.employee_id}>
                        {member.employees?.name ?? "Unknown"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Nội dung feedback</span>
                <textarea
                  className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
                  placeholder="Nhập feedback của bạn..."
                  value={feedbackDraft}
                  onChange={(event) => setFeedbackDraft(event.target.value)}
                  disabled={feedbackLoading || feedbackSaving || !selectedFeedbackTarget}
                />
              </label>

              {feedbackError && <p className="text-xs text-red-500">{feedbackError}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveFeedback()}
                  disabled={
                    feedbackSaving ||
                    feedbackLoading ||
                    !selectedFeedbackTarget ||
                    feedbackDraft.trim().length === 0
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {feedbackSaving ? "Đang lưu..." : "Lưu feedback"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
