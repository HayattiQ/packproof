import type { ImageMatchAdapter, OcrAdapter, ValuationAdapter } from "@/lib/ai/types";
import { MockOcrAdapter } from "@/lib/ai/ocr/mock";
import { VisionOcrAdapter } from "@/lib/ai/ocr/vision";
import { MockImageMatchAdapter } from "@/lib/ai/imagematch/mock";
import { PhashImageMatchAdapter } from "@/lib/ai/imagematch/phash";
import { MockValuationAdapter } from "@/lib/ai/valuation/mock";
import { CompsValuationAdapter } from "@/lib/ai/valuation/comps";

export * from "@/lib/ai/types";

/**
 * Parse PACKPROOF_ADAPTERS into a set of enabled real-adapter tokens.
 * Empty / "mock" => no real adapters (everything mock).
 */
export function enabledAdapters(): Set<string> {
  const raw = (process.env.PACKPROOF_ADAPTERS || "mock").toLowerCase();
  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && t !== "mock");
  return new Set(tokens);
}

export function adapterEnabled(token: string): boolean {
  return enabledAdapters().has(token.toLowerCase());
}

export function getOcrAdapter(): OcrAdapter {
  return adapterEnabled("vision") || adapterEnabled("ocr")
    ? new VisionOcrAdapter()
    : new MockOcrAdapter();
}

export function getImageMatchAdapter(): ImageMatchAdapter {
  return adapterEnabled("phash") || adapterEnabled("imagematch")
    ? new PhashImageMatchAdapter()
    : new MockImageMatchAdapter();
}

export function getValuationAdapter(): ValuationAdapter {
  return adapterEnabled("comps") || adapterEnabled("valuation")
    ? new CompsValuationAdapter()
    : new MockValuationAdapter();
}
