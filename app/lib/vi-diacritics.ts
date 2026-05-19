type RestorerOptions = {
  apiKey?: string;
  host?: string;
};

export class VietnameseDiacriticsRestorer {
  private apiKey?: string;
  private host: string;

  constructor(options: RestorerOptions) {
    this.apiKey = options.apiKey;
    this.host = options.host ?? "https://api-free.deepl.com";
  }

  async restore(text: string): Promise<string> {
    const input = text.trim();
    if (!this.apiKey || !input) return input;

    // Use DeepL translate endpoint to attempt restoring Vietnamese diacritics.
    // This is a best-effort approach: we send the text and request Vietnamese output.
    const params = new URLSearchParams();
    params.append("text", input);
    params.append("target_lang", "VI");

    try {
      const res = await fetch(`${this.host}/v2/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
        body: params.toString(),
      });

      const payload = await res.json();
      if (!res.ok) return input;

      const translated = payload?.translations?.[0]?.text;
      return typeof translated === "string" && translated.trim().length > 0 ? translated.trim() : input;
    } catch {
      return input;
    }
  }
}
