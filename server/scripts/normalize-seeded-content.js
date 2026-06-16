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

const topicMap = new Map([
  ["Backend", "Phát triển Backend"],
  ["Bug Fix", "Sửa lỗi"],
  ["Company Policy", "Quy định công ty"],
  ["Documentation", "Tài liệu nội bộ"],
  ["Frontend", "Phát triển Frontend"],
  ["General", "Thông báo chung"],
  ["Japanese Communication", "Giao tiếp Việt - Nhật"],
  ["Meeting", "Cuộc họp"],
  ["Project", "Quản lý dự án"],
  ["Sprint Planning", "Lập kế hoạch sprint"],
  ["Testing", "Kiểm thử"],
  ["UI UX", "UI/UX"],
]);

const normalizeTopic = (topic) => {
  if (!topic) return topic;
  const withoutSeedSuffix = topic.replace(/-demo02-\d+$/i, "").trim();
  return topicMap.get(withoutSeedSuffix) ?? withoutSeedSuffix;
};

const normalizeTitle = (title) =>
  title
    .replace(/\s+#\d+\s*-\s*culture_seed_01$/i, "")
    .replace(/\s+demo02-\d+$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const looksSeeded = (value) => /demo02|culture_seed|nội dung .*demo|đây là bài viết bảng tin nội bộ|bài wiki này giải thích/i.test(value ?? "");

const buildPostContent = (title, topic) =>
  [
    `Bài viết này chia sẻ thông tin nội bộ về ${topic.toLowerCase()}, tập trung vào chủ đề "${title}".`,
    "Nội dung giúp các thành viên nắm được bối cảnh, việc cần chú ý và cách phối hợp trong công việc hằng ngày.",
    "Nếu có câu hỏi hoặc đề xuất cải tiến, mọi người có thể phản hồi trực tiếp trong nhóm phụ trách để thống nhất cách thực hiện.",
  ].join(" ");

const buildWikiContent = (title, topic) =>
  [
    `Tài liệu này tổng hợp hướng dẫn về ${topic.toLowerCase()}, với trọng tâm là "${title}".`,
    "Mục tiêu là giúp nhân viên mới và các thành viên trong dự án hiểu rõ quy trình, kỳ vọng khi phối hợp, cũng như những lưu ý cần áp dụng trong thực tế.",
    "Khi nội dung hoặc quy trình thay đổi, bài viết cần được cập nhật để cả nhóm dùng cùng một nguồn tham khảo.",
  ].join(" ");

const normalizeRows = async (table, buildContent) => {
  const { data, error } = await supabase
    .from(table)
    .select("id,topic,title,content,created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const plannedRows = (data ?? []).map((row) => {
    const seeded = looksSeeded(row.topic) || looksSeeded(row.title) || looksSeeded(row.content);
    const contentWasSeeded = looksSeeded(row.content);
    const topic = seeded ? normalizeTopic(row.topic) : row.topic;
    const title = seeded ? normalizeTitle(row.title) : row.title;

    return {
      row,
      seeded,
      contentWasSeeded,
      topic,
      title,
      content: seeded && contentWasSeeded ? buildContent(title, topic ?? "thông báo chung") : row.content,
    };
  });

  if (table === "wiki_articles") {
    const groups = new Map();
    for (const planned of plannedRows) {
      const key = `${planned.topic ?? ""}\u0000${planned.title}`;
      groups.set(key, [...(groups.get(key) ?? []), planned]);
    }

    for (const group of groups.values()) {
      if (group.length < 2) continue;

      const hasCleanOwner = group.some((planned) => !planned.seeded);
      let partNumber = 2;

      for (const planned of group) {
        if (!planned.seeded) continue;
        if (!hasCleanOwner && partNumber === 2 && group[0] === planned) {
          partNumber += 1;
          continue;
        }

        planned.title = `${planned.title} - phần ${partNumber}`;
        partNumber += 1;

        if (planned.contentWasSeeded) {
          planned.content = buildContent(planned.title, planned.topic ?? "thông báo chung");
        }
      }
    }
  }

  if (table === "posts") {
    const groups = new Map();
    for (const planned of plannedRows) {
      const key = `${planned.topic ?? ""}\u0000${planned.title}`;
      groups.set(key, [...(groups.get(key) ?? []), planned]);
    }

    for (const group of groups.values()) {
      if (group.length < 2) continue;
      let partNumber = 2;

      for (const planned of group.slice(1)) {
        if (!planned.seeded) continue;
        planned.title = `${planned.title} - lần ${partNumber}`;
        partNumber += 1;

        if (planned.contentWasSeeded) {
          planned.content = buildContent(planned.title, planned.topic ?? "thông báo chung");
        }
      }
    }
  }

  const updates = [];

  for (const planned of plannedRows) {
    if (planned.topic !== planned.row.topic || planned.title !== planned.row.title || planned.content !== planned.row.content) {
      updates.push({
        id: planned.row.id,
        payload: {
          topic: planned.topic,
          title: planned.title,
          content: planned.content,
        },
      });
    }
  }

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from(table)
      .update(update.payload)
      .eq("id", update.id);

    if (updateError) throw updateError;
  }

  return updates.length;
};

const run = async () => {
  const [postsUpdated, wikiUpdated] = await Promise.all([
    normalizeRows("posts", buildPostContent),
    normalizeRows("wiki_articles", buildWikiContent),
  ]);

  console.log(
    JSON.stringify(
      {
        postsUpdated,
        wikiArticlesUpdated: wikiUpdated,
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
