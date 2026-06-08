/**
 * Deterministic seeded helpers shared by every mock adapter.
 *
 * Mocks must be PURE FUNCTIONS of their inputs: the same cert number / image
 * bytes must always produce the same OCR fields, image-match score, and
 * valuation. This makes tests reproducible and lets the demo run with no
 * network. We derive all randomness from a 32-bit FNV-1a hash of a string
 * seed, then expand it with a small xorshift PRNG.
 */

/** FNV-1a 32-bit hash of a UTF-8 string. Stable across runs and platforms. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts to stay in int range.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A deterministic PRNG seeded from a string. Returns floats in [0, 1). */
export function seededRng(seed: string): () => number {
  let state = fnv1a32(seed) || 0x9e3779b9;
  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

/** Deterministic integer in [min, max] inclusive from a seed + label. */
export function seededInt(seed: string, min: number, max: number): number {
  const r = seededRng(seed)();
  return min + Math.floor(r * (max - min + 1));
}

/** Deterministic pick from a list. */
export function seededPick<T>(seed: string, items: readonly T[]): T {
  if (items.length === 0) throw new Error("seededPick: empty list");
  return items[seededInt(seed, 0, items.length - 1)];
}

/**
 * Stable hex digest (8 chars) from a string — used to fabricate deterministic
 * "image fingerprints" for the mock image-match adapter when no real perceptual
 * hash library is available.
 */
export function shortHex(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, "0");
}
