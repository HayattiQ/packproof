import type { OcrAdapter, OcrResult, SlabImage } from "@/lib/ai/types";
import { MockOcrAdapter } from "@/lib/ai/ocr/mock";

/**
 * Real best-effort OCR via an OpenAI-compatible Vision chat endpoint.
 *
 * Server-only. Requires OPENAI_API_KEY. If the key is missing or the request
 * fails, it transparently falls back to the deterministic mock so the pipeline
 * never throws on a misconfigured environment. We ask the model to return a
 * strict JSON object and parse it defensively.
 */
export class VisionOcrAdapter implements OcrAdapter {
  readonly name = "ocr:vision";
  private fallback = new MockOcrAdapter();

  async extract(images: SlabImage[]): Promise<OcrResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return this.fallback.extract(images);

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          "You are reading a PSA-graded trading card slab label. Return ONLY a JSON object " +
          'with keys: certNumber (string|null), grade (integer 1-10|null), gradeLabel (string|null), ' +
          "cardLabel (string|null). Read the flatlabel exactly.",
      },
    ];
    for (const img of images) {
      const url = img.data.startsWith("data:")
        ? img.data
        : `data:${img.mime || "image/jpeg"};base64,${img.data}`;
      content.push({ type: "image_url", image_url: { url } });
    }

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      });
      if (!res.ok) return this.fallback.extract(images);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = json.choices?.[0]?.message?.content;
      if (!raw) return this.fallback.extract(images);
      const parsed = JSON.parse(raw) as Partial<OcrResult>;
      return {
        certNumber: parsed.certNumber ?? null,
        grade: typeof parsed.grade === "number" ? parsed.grade : null,
        gradeLabel: parsed.gradeLabel ?? null,
        cardLabel: parsed.cardLabel ?? null,
        confidence: 0.9,
        source: this.name,
      };
    } catch {
      return this.fallback.extract(images);
    }
  }
}
