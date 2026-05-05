const feedbacks = [
  "Tanakaさん: 報告の粒度が良くなりました。",
  "Namさん: 翻訳サポートが速くて明確です / Translation hỗ trợ rất nhanh và rõ ràng.",
  "Team Dev: 連携がスムーズで助かりました。",
  "Hoaさん: レビューコメントが具体的で助かります。",
  "PM: 進捗更新が安定していてとても良いです / Tiến độ cập nhật đều đặn, rất tốt.",
  "Khanh: 日本語資料のサポートありがとうございます / Cảm ơn đã hỗ trợ phần tài liệu Nhật ngữ.",
  "HR: 協力的なコミュニケーションが素晴らしいです。",
  "Admin: ログ管理の整理に貢献してくれました。",
];

export default function ProfilePage() {
  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tanaka&backgroundColor=e2e8f0"
            alt="profile"
            className="w-20 h-20 rounded-full mx-auto"
          />
          <h2 className="font-bold text-slate-800 mt-3">Tanaka K.</h2>
          <p className="text-xs text-slate-500">日本人スタッフ / Role ID: 1</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-slate-900">プロフィール・評価画面</h3>
          <p className="text-sm text-slate-500 mb-3">
            プロフィールと評価画面 / Màn hình Profile & Feedback
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {feedbacks.map((f) => (
              <li key={f} className="border border-slate-100 rounded-lg p-3">
                {f}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
