import {
  AlertCircle,
  BookOpen,
  CheckSquare,
  Clock,
  MessageSquare,
} from "lucide-react";

const myTasks = [
  {
    status: "進行中 / Doing",
    statusClass: "bg-yellow-100 text-yellow-700",
    title: "要件定義書のレビュー",
    sub: "要件資料レビュー / Review tài liệu requirement",
    due: "今日まで (Hôm nay)",
    dueClass: "text-red-500",
  },
  {
    status: "未着手 / To do",
    statusClass: "bg-slate-100 text-slate-600",
    title: "週次レポートの作成",
    sub: "週次レポート作成 / Làm báo cáo tuần",
    due: "明日 (Ngày mai)",
    dueClass: "text-slate-400",
  },
  {
    status: "進行中 / Doing",
    statusClass: "bg-yellow-100 text-yellow-700",
    title: "翻訳ログの整理",
    sub: "翻訳履歴の標準化 / Chuẩn hóa lịch sử dịch",
    due: "2日後",
    dueClass: "text-slate-400",
  },
  {
    status: "未着手 / To do",
    statusClass: "bg-slate-100 text-slate-600",
    title: "顧客向け報告メール",
    sub: "顧客向け報告メール作成 / Soạn mail báo cáo khách hàng",
    due: "今週金曜",
    dueClass: "text-slate-400",
  },
];

const latestMessages = [
  {
    user: "Nguyen Van Nam",
    time: "10:42",
    text: "仕様について確認したいことがあります。(Tôi muốn confirm về spec)",
    avatar: "Nam",
    avatarClass: "bg-orange-100 text-orange-600",
    online: true,
  },
  {
    user: "開発チーム (Team Dev)",
    time: "09:15",
    text: "Hoa: APIの実装が完了しました。(Đã code xong API)",
    avatar: "Dev",
    avatarClass: "bg-indigo-100 text-indigo-600",
    online: false,
  },
  {
    user: "PM Room",
    time: "08:56",
    text: "今週スプリント進捗を更新しました / Tiến độ sprint tuần này đã cập nhật.",
    avatar: "PM",
    avatarClass: "bg-blue-100 text-blue-600",
    online: false,
  },
  {
    user: "Tanaka K.",
    time: "08:20",
    text: "本日の優先度はTask Boardを確認してください。",
    avatar: "TK",
    avatarClass: "bg-emerald-100 text-emerald-600",
    online: false,
  },
];

const announcements = [
  {
    badge: "4月",
    badge2: "30",
    badgeClass: "bg-red-50 text-red-600",
    title: "4/30〜5/1の祝日休業のお知らせ",
    body: "4/30-5/1の休業案内。休暇前に進捗更新をお願いします / Thông báo lịch nghỉ lễ 30/4 - 1/5. Vui lòng cập nhật tiến độ trước kì nghỉ...",
  },
  {
    badge: "New",
    badge2: "Wiki",
    badgeClass: "bg-emerald-50 text-emerald-600",
    title: "報連相（ホウレンソウ）の基本ガイド",
    body: "Wiki: ホウレンソウ文化の基本ガイド / Hướng dẫn cơ bản về văn hóa Ho-Ren-So dành cho nhân viên mới...",
  },
  {
    badge: "Info",
    badge2: "IT",
    badgeClass: "bg-blue-50 text-blue-600",
    title: "VPNメンテナンスのお知らせ",
    body: "本日22:00にVPNを15分メンテナンス / Tối nay 22:00 sẽ bảo trì VPN trong 15 phút.",
  },
  {
    badge: "Team",
    badge2: "HR",
    badgeClass: "bg-amber-50 text-amber-600",
    title: "社内ランチ交流会（今週木曜）",
    body: "水曜10:00までに社内ランチへ登録 / Đăng ký tham gia lunch nội bộ trước thứ 4, 10:00.",
  },
];

export default function DashboardPage() {
  return (
    <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center text-slate-800">
                  <CheckSquare className="w-5 h-5 mr-2 text-blue-600" />{" "}
                  マイタスク
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  マイタスク / Task của tôi
                </p>
              </div>
              <button className="text-sm text-blue-600 hover:underline font-medium">
                すべて見る (Xem tất cả)
              </button>
            </div>

            <div className="space-y-3">
              {myTasks.map((task) => (
                <div
                  key={task.title}
                  className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded mb-1 ${task.statusClass}`}
                      >
                        {task.status}
                      </span>
                      <h3 className="text-sm font-medium text-slate-800">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{task.sub}</p>
                    </div>
                    <div
                      className={`flex items-center text-xs font-medium ${task.dueClass}`}
                    >
                      <Clock className="w-3 h-3 mr-1" /> {task.due}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center text-slate-800">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />{" "}
                  最新メッセージ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  最新メッセージ / Tin nhắn mới nhất
                </p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                5 未読 (5 chưa đọc)
              </span>
            </div>

            <div className="space-y-0 divide-y divide-slate-100">
              {latestMessages.map((msg) => (
                <div
                  key={`${msg.user}-${msg.time}`}
                  className="py-3 flex items-start cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${msg.avatarClass}`}
                  >
                    {msg.avatar}
                    {msg.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-slate-800">
                        {msg.user}
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        {msg.time}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium mt-0.5">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold flex items-center text-slate-800">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />{" "}
              最新のお知らせ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              最新通知 / Thông báo / Bảng tin mới
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((news) => (
              <div
                key={news.title}
                className="flex p-3 border border-slate-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded flex flex-col items-center justify-center shrink-0 ${news.badgeClass}`}
                >
                  <span className="text-xs font-bold">{news.badge}</span>
                  <span className="text-base font-black leading-none mt-0.5">
                    {news.badge2}
                  </span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-slate-800 hover:text-blue-600">
                    {news.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{news.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
