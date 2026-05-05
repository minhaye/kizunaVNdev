import {
  ArrowLeft,
  Info,
  Phone,
  SendHorizontal,
  Smile,
  Video,
} from "lucide-react";
import Link from "next/link";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
              <div className="relative w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {id.slice(0, 2).toUpperCase()}
                <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {id}
                </h2>
                <p className="text-xs text-emerald-600 font-medium">
                  オンライン中 / Đang hoạt động
                </p>
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

          <div className="flex-1 p-5 space-y-4 bg-slate-50/40">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                DV
              </div>
              <div className="max-w-[75%] rounded-2xl rounded-tl-md bg-white border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm">
                みなさん、おはようございます。今日の優先タスクを共有します。
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-blue-600 px-4 py-2 text-sm text-white shadow-sm">
                ありがとうございます。11:30までにAPIテスト対応します。 / Cảm ơn
                team, mình sẽ xử lý phần API test trước 11:30.
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                DV
              </div>
              <div className="max-w-[75%] rounded-2xl rounded-tl-md bg-white border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm">
                Perfect. 仕様の疑問があればこのチャネルに残してください。
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-blue-600 px-4 py-2 text-sm text-white shadow-sm">
                了解です。終業前にホウレンソウを更新します。 / Ok anh, em sẽ cập
                nhật Ho-Ren-So vào cuối ngày nhé.
              </div>
            </div>
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
              />
              <button className="self-end inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shrink-0">
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
