import { VietnameseDiacriticsRestorer } from "../../lib/vi-diacritics";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

type TranslateResponse = {
  translated: string;
  detected_language: "ja" | "vi";
  target_language: "ja" | "vi";
};

const detectLanguage = (value: string): "ja" | "vi" => {
  const hasJapanese = /[\u3040-\u30ff\u3400-\u9fff]/u.test(value);
  return hasJapanese ? "ja" : "vi";
};

const VI_DIACRITICS = /[áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/i;
const diacriticsRestorer = new VietnameseDiacriticsRestorer({
  apiKey: GROQ_API_KEY,
  model: GROQ_MODEL,
});

export async function POST(request: Request) {
  if (!GROQ_API_KEY) {
    return Response.json({ ok: false, error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  let body: { text?: string } | null = null;
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    body = null;
  }

  if (!body?.text || !body.text.trim()) {
    return Response.json({ ok: false, error: "Missing text" }, { status: 400 });
  }

  const trimmedText = body.text.trim();
  const shouldRestore = detectLanguage(trimmedText) === "vi" && !VI_DIACRITICS.test(trimmedText);
  const normalizedText = shouldRestore
    ? await diacriticsRestorer.restore(trimmedText)
    : trimmedText;

  const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a translation engine for Japanese and Vietnamese only. The input may be missing Vietnamese diacritics and may contain spelling mistakes. Normalize and correct the input as needed, then detect whether it is Japanese or Vietnamese and translate it to the other language. For Japanese output, use natural kanji/hiragana/katakana as appropriate and do NOT include furigana or readings in parentheses. Return JSON with keys: translated, detected_language (ja|vi), target_language (ja|vi).",
        },
        { role: "user", content: normalizedText },
      ],
    }),
  });

  const payload = await apiResponse.json();
  if (!apiResponse.ok) {
    return Response.json(
      { ok: false, error: payload?.error?.message ?? "Groq request failed" },
      { status: 500 },
    );
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    return Response.json({ ok: false, error: "Empty translation response" }, { status: 500 });
  }

  let parsed: TranslateResponse | null = null;
  try {
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    const jsonText = jsonStart >= 0 && jsonEnd >= 0 ? content.slice(jsonStart, jsonEnd + 1) : content;
    parsed = JSON.parse(jsonText) as TranslateResponse;
  } catch {
    parsed = null;
  }

  if (!parsed?.translated) {
    const match = content.match(/"translated"\s*:\s*"([\s\S]*?)"/);
    if (match?.[1]) {
      parsed = {
        translated: match[1].replace(/\\n/g, "\n").trim(),
        detected_language: detectLanguage(body.text),
        target_language: detectLanguage(body.text) === "ja" ? "vi" : "ja",
      };
    }
  }

  if (!parsed?.translated) {
    const cleaned = content.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
    parsed = {
      translated: cleaned,
      detected_language: detectLanguage(body.text),
      target_language: detectLanguage(body.text) === "ja" ? "vi" : "ja",
    };
  }

  if (parsed?.translated && (!parsed.detected_language || !parsed.target_language)) {
    const detected = detectLanguage(body.text);
    parsed = {
      translated: parsed.translated,
      detected_language: detected,
      target_language: detected === "ja" ? "vi" : "ja",
    };
  }

  if (!parsed?.translated) {
    return Response.json({ ok: false, error: "Invalid translation payload" }, { status: 500 });
  }

  return Response.json({ ok: true, data: parsed });
}
