import type { ImageMatchAdapter, ImageMatchQuery, ImageMatchResult, SlabImage } from "@/lib/ai/types";
import { MockImageMatchAdapter } from "@/lib/ai/imagematch/mock";

/**
 * Real best-effort perceptual-hash image-match adapter.
 *
 * Computes an 8x8 average-hash (aHash) of each submitted face and of each PSA
 * reference image, then scores similarity by mean Hamming distance. Uses
 * `sharp` (lazy dynamic import; declared in next.config serverExternalPackages).
 * If `sharp` is unavailable, there are no reference images, or decoding fails,
 * it falls back to the deterministic mock so the pipeline never throws.
 *
 * Server-only.
 */
export class PhashImageMatchAdapter implements ImageMatchAdapter {
  readonly name = "imagematch:phash";
  private fallback = new MockImageMatchAdapter();

  async match(query: ImageMatchQuery): Promise<ImageMatchResult> {
    if (query.referenceImageUrls.length === 0) return this.fallback.match(query);
    let sharp: typeof import("sharp");
    try {
      sharp = (await import("sharp")).default as unknown as typeof import("sharp");
    } catch {
      return this.fallback.match(query);
    }

    try {
      const refHashes = await Promise.all(
        query.referenceImageUrls.map(async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`ref fetch ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          return aHash(sharp, buf);
        }),
      );
      const subHashes = await Promise.all(
        query.images.map((img) => aHash(sharp, decode(img))),
      );

      let best = 64;
      for (const s of subHashes) {
        for (const r of refHashes) {
          best = Math.min(best, hamming(await s, await r));
        }
      }
      const similarity = 1 - best / 64;
      const counterfeitRisk = Math.max(0, Math.min(1, 1 - similarity));
      return {
        similarity,
        counterfeitRisk,
        notes: [
          `Computed 8x8 average-hash over ${query.images.length} submitted face(s) vs ${query.referenceImageUrls.length} reference image(s).`,
          `Best Hamming distance ${best}/64 => similarity ${(similarity * 100).toFixed(1)}%.`,
        ],
        source: this.name,
      };
    } catch {
      return this.fallback.match(query);
    }
  }
}

function decode(img: SlabImage): Buffer {
  const b64 = img.data.startsWith("data:") ? img.data.split(",")[1] ?? "" : img.data;
  return Buffer.from(b64, "base64");
}

async function aHash(sharp: typeof import("sharp"), buf: Buffer): Promise<bigint> {
  const raw = await sharp(buf).greyscale().resize(8, 8, { fit: "fill" }).raw().toBuffer();
  let sum = 0;
  for (const byte of raw) sum += byte;
  const avg = sum / raw.length;
  let hash = 0n;
  for (let i = 0; i < 64 && i < raw.length; i++) {
    hash = (hash << 1n) | (raw[i] >= avg ? 1n : 0n);
  }
  return hash;
}

function hamming(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}
