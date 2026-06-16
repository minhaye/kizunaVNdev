import "dotenv/config";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or Supabase key in server/.env");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: WebSocket,
  },
});

const jpLeaderEmail = "tanaka.hiroshi@kizuna.vn";
const jpMemberEmail = "yamamoto.yuki@kizuna.vn";

const loadEmployeeByEmail = async (email) => {
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,email,nationality,role,status")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Employee not found: ${email}`);
  return data;
};

const loadActiveVnEmployees = async () => {
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,email,nationality,role,status")
    .eq("nationality", "vn")
    .eq("status", "active")
    .order("name")
    .limit(3);

  if (error) throw error;
  if (!data || data.length < 2) throw new Error("Need at least 2 active Vietnamese employees for task assignees");
  return data;
};

const insertMissingByTitle = async (table, rows, selectColumns = "id,title") => {
  const inserted = [];
  const skipped = [];

  for (const row of rows) {
    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select("id,title")
      .eq("title", row.title)
      .limit(1);

    if (existingError) throw existingError;

    if (existing?.length) {
      skipped.push(row.title);
      continue;
    }

    const { data, error } = await supabase
      .from(table)
      .insert(row)
      .select(selectColumns)
      .single();

    if (error) throw error;
    inserted.push(data);
  }

  return { inserted, skipped };
};

const run = async () => {
  const [jpLeader, jpMember, vnEmployees] = await Promise.all([
    loadEmployeeByEmail(jpLeaderEmail),
    loadEmployeeByEmail(jpMemberEmail),
    loadActiveVnEmployees(),
  ]);

  const now = new Date();
  const isoDaysFromNow = (days) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(17, 0, 0, 0);
    return date.toISOString();
  };

  const posts = [
    {
      topic: "日本チーム",
      title: "日本側からの週次共有: 顧客ヒアリングで見えた改善点",
      content:
        "今週の顧客ヒアリングでは、通知の見落としを減らしたいという声が多くありました。次のスプリントでは、重要度の表示と未読の整理方法を重点的に確認したいです。",
      created_by: jpLeader.id,
      status: "published",
      reviewed_at: now.toISOString(),
    },
    {
      topic: "開発メモ",
      title: "日本語UIレビュー: タスク詳細画面の表現調整",
      content:
        "タスク詳細画面では、期限、担当者、報告状況の順番が自然に読めるようになってきました。文言は少し硬いので、利用者が迷わない短い表現に整えたいです。",
      created_by: jpMember.id,
      status: "published",
      reviewed_at: now.toISOString(),
    },
    {
      topic: "チーム連携",
      title: "ベトナムチームへの感謝と来週の確認事項",
      content:
        "今週も素早い対応をありがとうございます。来週は、チャット通知、Wiki承認フロー、タスク報告の3点を中心に一緒に確認しましょう。",
      created_by: jpLeader.id,
      status: "published",
      reviewed_at: now.toISOString(),
    },
  ];

  const wikiArticles = [
    {
      topic: "日本文化",
      title: "報連相の基本: 早めに共有する文化",
      content:
        "報連相は、報告、連絡、相談をまとめた日本の仕事文化です。問題が大きくなる前に短く共有することで、チーム全体が同じ状況を理解しやすくなります。",
      created_by: jpLeader.id,
      status: "approved",
      reviewed_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      topic: "日本文化",
      title: "会議前の準備: アジェンダと期待値をそろえる",
      content:
        "日本の職場では、会議前に目的、決めたいこと、相談したいことを明確にしておくと進行がスムーズです。短いメモでも、参加者の理解をそろえる助けになります。",
      created_by: jpMember.id,
      status: "approved",
      reviewed_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      topic: "コミュニケーション",
      title: "依頼するときの一言: 期限と背景を伝える",
      content:
        "依頼をするときは、作業内容だけでなく、なぜ必要なのか、いつまでに必要なのかを一緒に伝えると相手が判断しやすくなります。",
      created_by: jpLeader.id,
      status: "approved",
      reviewed_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  const tasks = [
    {
      assigner_id: jpLeader.id,
      assignee_id: vnEmployees[0].id,
      topic: "日本語レビュー",
      title: "タスク詳細画面の日本語文言を確認する",
      content:
        "期限、担当者、報告ボタンの文言が自然か確認してください。違和感がある場合は、候補文を2案ほどコメントしてください。",
      status: "pending",
      deadline: isoDaysFromNow(5),
    },
    {
      assigner_id: jpLeader.id,
      assignee_id: vnEmployees[1].id,
      topic: "Wiki",
      title: "報連相Wikiの表示確認を行う",
      content:
        "日本文化カテゴリの記事が一覧と詳細ページで正しく表示されるか確認してください。タグ、タイトル、本文の改行も見てください。",
      status: "in_progress",
      deadline: isoDaysFromNow(7),
    },
    {
      assigner_id: jpMember.id,
      assignee_id: jpLeader.id,
      topic: "チーム連携",
      title: "来週のJP/VN定例アジェンダを作成する",
      content:
        "チャット通知、承認待ち投稿、タスク報告の進捗を中心に、30分で確認できるアジェンダを作成してください。",
      status: "pending",
      deadline: isoDaysFromNow(3),
    },
    {
      assigner_id: jpLeader.id,
      assignee_id: vnEmployees[2].id,
      topic: "品質確認",
      title: "日本語投稿データのフィルタ表示を確認する",
      content:
        " bảng tin と Wiki で日本語タイトルが検索、並び順、詳細表示に問題なく出るか確認してください。",
      status: "pending",
      deadline: isoDaysFromNow(6),
    },
  ];

  const [postResult, wikiResult, taskResult] = await Promise.all([
    insertMissingByTitle("posts", posts),
    insertMissingByTitle("wiki_articles", wikiArticles),
    insertMissingByTitle("tasks", tasks, "id,title,status,assigner_id,assignee_id"),
  ]);

  console.log(
    JSON.stringify(
      {
        createdBy: {
          jpLeader: jpLeader.name,
          jpMember: jpMember.name,
        },
        posts: {
          inserted: postResult.inserted.length,
          skipped: postResult.skipped.length,
        },
        wikiArticles: {
          inserted: wikiResult.inserted.length,
          skipped: wikiResult.skipped.length,
        },
        tasks: {
          inserted: taskResult.inserted.length,
          skipped: taskResult.skipped.length,
        },
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
