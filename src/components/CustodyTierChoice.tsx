"use client";

import type { CustodyTier } from "@/lib/http/responses";

/**
 * Custody-tier selector. Both tiers are first-class; the copy makes the honest
 * trade-off explicit (custodial = tradable / redeemable; non-custodial =
 * provenance attestation only, not sellable).
 */
export function CustodyTierChoice({
  value,
  onChange,
}: {
  value: CustodyTier;
  onChange: (tier: CustodyTier) => void;
}) {
  return (
    <fieldset className="custody-choice">
      <legend className="eyebrow">Choose how you hold this card</legend>
      <label className={`custody-option ${value === "custodial" ? "selected" : ""}`}>
        <input
          type="radio"
          name="custody"
          checked={value === "custodial"}
          onChange={() => onChange("custodial")}
        />
        <span>
          <strong>Custodial / vaulted</strong>
          <small>We hold the physical card. The NFT is redeemable 1:1 and can be sold on the marketplace.</small>
        </span>
      </label>
      <label className={`custody-option ${value === "non-custodial" ? "selected" : ""}`}>
        <input
          type="radio"
          name="custody"
          checked={value === "non-custodial"}
          onChange={() => onChange("non-custodial")}
        />
        <span>
          <strong>Non-custodial provenance</strong>
          <small>You keep the card. The NFT is an authenticity + provenance proof only — not for sale here. Upgrade later by vaulting.</small>
        </span>
      </label>
    </fieldset>
  );
}
