import { VietnameseDiacriticsRestorer } from "../../lib/vi-diacritics";

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_HOST = process.env.DEEPL_API_HOST ?? "https://api-free.deepl.com";

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
  apiKey: DEEPL_API_KEY,
  host: DEEPL_API_HOST,
});

export async function POST(request: Request) {
  if (!DEEPL_API_KEY) {
    return Response.json({ ok: false, error: "Missing DEEPL_API_KEY" }, { status: 500 });
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
  const normalizedText = shouldRestore ? await diacriticsRestorer.restore(trimmedText) : trimmedText;

  const detected = detectLanguage(trimmedText);
  const targetLang = detected === "ja" ? "VI" : "JA";

  const params = new URLSearchParams();
  params.append("text", normalizedText);
  params.append("target_lang", targetLang);

  const deeplRes = await fetch(`${DEEPL_API_HOST}/v2/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
    },
    body: params.toString(),
  });

  let deeplPayload: any = null;
  try {
    deeplPayload = await deeplRes.json();
  } catch (e) {
    return Response.json({ ok: false, error: "Invalid DeepL response" }, { status: 500 });
  }

  if (!deeplRes.ok) {
    return Response.json({ ok: false, error: deeplPayload?.message ?? "DeepL request failed" }, { status: 500 });
  }

  const translated = deeplPayload?.translations?.[0]?.text;
  const detectedSource = deeplPayload?.translations?.[0]?.detected_source_language;
  const detectedLang = detectedSource
    ? detectedSource.toLowerCase().startsWith("ja")
      ? "ja"
      : detectedSource.toLowerCase().startsWith("vi")
      ? "vi"
      : detected
    : detected;

  if (!translated) {
    return Response.json({ ok: false, error: "Empty DeepL translation" }, { status: 500 });
  }

  const target_language = detectedLang === "ja" ? "vi" : "ja";

  return Response.json({
    ok: true,
    data: {
      translated: translated as string,
      detected_language: detectedLang as "ja" | "vi",
      target_language: target_language as "ja" | "vi",
    },
  });
}
