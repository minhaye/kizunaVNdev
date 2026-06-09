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
  markChatRoomRead,
  notifyChatUnreadChanged,
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

const CHAT_REFRESH_INTERVAL_MS = 5_000;
const ONLINE_WINDOW_MS = 15_000;

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
      setError("無効なチャットルームID / ID phòng chat không hợp lệ");
      setLoading(false);
      return;
    }

    let active = true;

    const loadRoom = async () => {
      try {
        setLoading(true);
        setError("");
        const [data] = await Promise.all([
          fetchChatRoomDetail(roomId),
          markChatRoomRead(roomId).catch(() => null),
        ]);
        if (!active) return;
        setRoom(data);
        notifyChatUnreadChanged();
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "チャットを読み込めません / Không thể tải phòng chat");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRoom();

    return () => {
      active = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    let active = true;
    const timer = window.setInterval(() => {
      void fetchChatRoomDetail(roomId)
        .then((data) => {
          if (!active) return;
          setRoom(data);
          notifyChatUnreadChanged();
        })
        .catch(() => {
          // Keep the last successfully loaded room during transient network issues.
        });
    }, CHAT_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
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
      setFeedbackError("フィードバック対象がありません / Không có thành viên nào để feedback.");
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
        setFeedbackError(loadError instanceof Error ? loadError.message : "フィードバックを読み込めません / Không thể tải feedback");
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
      setFeedbackError(saveError instanceof Error ? saveError.message : "フィードバックを保存できません / Không thể lưu feedback");
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
      try {
        await markChatRoomRead(roomId);
      } catch {
        // Ignore read-update errors after a successful send.
      }
      notifyChatUnreadChanged();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "メッセージを送信できません / Không thể gửi tin nhắn");
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
        throw new Error(payload?.error || "翻訳に失敗しました / Không thể dịch tin nhắn");
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
          error: translateError instanceof Error ? translateError.message : "翻訳に失敗しました / Không thể dịch",
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
    return Date.now() - timestamp <= ONLINE_WINDOW_MS;
  };

  return (
    <main className="flex-1 overflow-hidden p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto h-full">
        <section className="h-full min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
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
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${room?.online ? "bg-emerald-500" : "bg-amber-400"}`} />
          <p className={`text-xs font-medium ${room?.online ? "text-emerald-600" : "text-slate-500"}`}>
            {room?.online ? (
              <span className="block">オンライン中</span>
            ) : (
              <span className="block">オフライン</span>
            )}
            <span className="block">{room?.online ? "Đang hoạt động" : "Ngoại tuyến"}</span>
          </p>
        </div>
      )}
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

      <div className="flex-1 min-h-0 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                <span className="block">会話を読み込み中...</span>
                <span className="block">Đang tải hội thoại...</span>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-dashed border-red-200 bg-white px-4 py-6 text-center text-sm text-red-500">
                {error}
              </div>
            ) : room?.messages.length ? (
              room.messages.map((message) => {
                const mine = message.sender_id === actorEmployeeId;
                const sender = room.members.find((member) => member.employee_id === message.sender_id);
                const senderName = sender?.employees?.name ?? "不明 / Không rõ";
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
                <span className="block">まだメッセージがありません</span>
                <span className="block">Chưa có tin nhắn nào.</span>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-100 p-4 bg-white">
            <div className="rounded-2xl border border-slate-200 px-3 py-2 flex items-start gap-2 bg-slate-50">
              <button className="mt-1 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <Smile className="w-4 h-4 text-slate-500" />
              </button>
              <textarea
                className="w-full resize-none bg-transparent text-sm text-slate-800 outline-none py-2"
                rows={2}
                placeholder="送信内容を入力... / Nhập nội dung gửi..."
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
                <SendHorizontal className="w-4 h-4" />
                <span className="leading-tight">
                  <span className="block">送信</span>
                  <span className="block">Gửi</span>
                </span>
              </button>
            </div>
          </footer>
        </section>
      </div>

      {feedbackOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className="block">フィードバック送信</span>
                  <span className="block">Gửi feedback</span>
                </p>
                <p className="text-xs text-slate-500">
                  {selectedFeedbackTarget ? (
                    <>
                      <span className="block">評価</span>
                      <span className="block">Đánh giá: {selectedFeedbackTarget.employees?.name ?? "người này"}</span>
                    </>
                  ) : (
                    <>
                      <span className="block">受信者を選択</span>
                      <span className="block">Chọn người nhận feedback</span>
                    </>
                  )}
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
                  <span className="text-xs font-medium text-slate-600">
                    <span className="block">受信者</span>
                    <span className="block">Người nhận</span>
                  </span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={selectedFeedbackTarget?.employee_id ?? ""}
                    onChange={(event) => setFeedbackTargetId(event.target.value)}
                  >
                    {feedbackTargets.map((member) => (
                      <option key={member.employee_id} value={member.employee_id}>
                              {member.employees?.name ?? "不明 / Không rõ"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  <span className="block">フィードバック内容</span>
                  <span className="block">Nội dung feedback</span>
                </span>
                <textarea
                  className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
                  placeholder="フィードバックを入力... / Nhập feedback..."
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
                  {feedbackSaving ? "保存中... / Đang lưu..." : "保存 / Lưu feedback"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
