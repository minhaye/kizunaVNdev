export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const status: "todo" | "doing" | "done" = id.includes("migration")
    ? "done"
    : id.includes("review") || id.includes("report") || id.includes("wiki")
      ? "todo"
      : "doing";
  const canWriteHorensou = status === "doing" || status === "done";

  const statusLabel =
    status === "todo"
      ? "未着手 / To do"
      : status === "doing"
        ? "進行中 / Doing"
        : "完了 / Done";

  const statusClass =
    status === "todo"
      ? "bg-slate-100 text-slate-700"
      : status === "doing"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-4">
        <header>
          <h2 className="text-xl font-bold text-slate-900">
            タスク詳細・報告画面
          </h2>
          <p className="text-sm text-slate-500">Task ID: {id}</p>
        </header>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500">Task title</p>
            <p className="font-semibold text-slate-800">要件定義書のレビュー</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Due</p>
            <p className="text-sm font-semibold text-slate-700">
              今日 / Hôm nay
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full font-semibold ${statusClass}`}
            >
              {statusLabel}
            </span>
            {status === "todo" && (
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                タスク受領 / Nhận task
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Description</p>
            <p className="text-sm text-slate-700">
              報連相フォーマットに沿って、目的・進捗・課題・次アクションを記載してください。
            </p>
          </div>
        </section>

        {canWriteHorensou && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-3">
                報連相・進捗報告 (Hō-Ren-Sō)
              </h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 p-3">
                  報告: 本日の進捗 70%
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  連絡: レビュー会議 15:00
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  相談: API仕様の境界値の定義を確認したいです。
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-3">
                Hō-Ren-Sōを書く / Viết Ho-Ren-So
              </h3>
              <div className="space-y-3 text-sm">
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="報告 (Report)"
                />
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="連絡 (Inform)"
                />
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="相談 (Consult)"
                />
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  保存 / Lưu Hō-Ren-Sō
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
