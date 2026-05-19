type RestorerOptions = {
  apiKey?: string;
  model: string;
};

export class VietnameseDiacriticsRestorer {
  private apiKey?: string;
  private model: string;

  constructor(options: RestorerOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async restore(text: string): Promise<string> {
    const input = text.trim();
    if (!this.apiKey || !input) return input;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You restore Vietnamese diacritics. Return only the corrected Vietnamese text with proper accents. Do not add extra commentary.",
          },
          { role: "user", content: input },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) return input;

    const content = payload?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0 ? content.trim() : input;
  }
}
