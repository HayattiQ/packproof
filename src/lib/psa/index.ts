import type { PsaAdapter } from "@/lib/psa/types";
import { MockPsaAdapter } from "@/lib/psa/mock";
import { OfficialPsaAdapter } from "@/lib/psa/official";
import { adapterEnabled } from "@/lib/ai";

export * from "@/lib/psa/types";

/**
 * Select the PSA adapter from PACKPROOF_ADAPTERS. The real "official" adapter is
 * used only when explicitly enabled AND a token is present (it self-falls-back
 * to mock otherwise). Default => mock.
 */
export function getPsaAdapter(): PsaAdapter {
  if (adapterEnabled("official") || adapterEnabled("psa")) {
    return new OfficialPsaAdapter();
  }
  return new MockPsaAdapter();
}
