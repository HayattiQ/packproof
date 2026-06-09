import { keccak256, toBytes, type Hex } from "viem";
import type { AuthenticationReport } from "@/lib/agents/types";

/**
 * Report canonicalization + content hashing.
 *
 * LOAD-BEARING CROSS-DOMAIN CONTRACT: the on-chain `outputHash` written by the
 * AI-attestation log, and recomputed by the Minds-Bazaar verify Skill, MUST be
 * derived from EXACTLY this canonicalization. Any verifier (the Skill, an
 * auditor, another Mind) recomputes the hash by:
 *
 *   1. canonicalizing the JSON report with `canonicalizeReport` (recursively
 *      sorting object keys, stable number/string encoding, no insignificant
 *      whitespace), then
 *   2. hashing the UTF-8 bytes of that canonical string with keccak256.
 *
 * => reportHash = keccak256(utf8Bytes(canonicalJson(report)))
 *
 * Do not change the canonicalization without coordinating with the skill domain.
 */

/** Recursively sort object keys and drop `undefined` to produce a stable JSON. */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const v = obj[key];
      if (v === undefined) continue;
      out[key] = canonicalize(v);
    }
    return out;
  }
  return value;
}

/** Canonical JSON string for a report (stable, key-sorted, compact). */
export function canonicalizeReport(report: AuthenticationReport): string {
  return JSON.stringify(canonicalize(report));
}

/**
 * The on-chain content hash of an authentication report.
 * reportHash = keccak256(utf8(canonicalJson(report))).
 */
export function reportHash(report: AuthenticationReport): Hex {
  return keccak256(toBytes(canonicalizeReport(report)));
}

/** Generic keccak256 of an arbitrary JSON-able input hash (e.g. pipeline input). */
export function jsonHash(value: unknown): Hex {
  return keccak256(toBytes(JSON.stringify(canonicalize(value))));
}
