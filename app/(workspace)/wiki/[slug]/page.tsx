export default async function WikiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <article className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <p className="text-xs text-slate-500">記事・ルール詳細画面 / {slug}</p>
        <h2 className="text-xl font-bold text-slate-900 mt-2">
          報連相（ホウレンソウ）の基本ガイド
        </h2>
        <div className="mt-4 space-y-3 text-sm text-slate-700 leading-6">
          <p>1. 報告: 事実と結論を先に短く伝える。</p>
          <p>2. 連絡: 期限・担当・影響範囲を明確にする。</p>
          <p>3. 相談: 課題・仮説・希望する判断をセットで提示する。</p>
          <p>
            ベトナム語サマリー: Bao cao ngan gon, lien lac ro rang, va chu dong
            xin tu van.
          </p>
        </div>
      </article>
    </main>
  );
}
