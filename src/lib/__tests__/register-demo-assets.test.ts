import { describe, expect, it } from "vitest";
import { runAuthentication } from "@/lib/agents/authentication";
import { REGISTER_DEMO_ASSETS } from "@/lib/register-demo-assets";
import { PSA_FIXTURES } from "@/lib/psa/fixtures";
import { psaCertUrl } from "@/lib/psa/cert-url";
import { mintedImageUrlForRegistration } from "@/lib/register-mint-image";
import type { SlabImage } from "@/lib/ai/types";

describe("register demo assets", () => {
  it("keeps four judge-ready PSA sample slabs", () => {
    expect(REGISTER_DEMO_ASSETS).toHaveLength(4);
    for (const asset of REGISTER_DEMO_ASSETS) {
      expect(asset.grade).toBe(10);
      expect(asset.gradeLabel).toBe("GEM MT");
      expect(asset.imageUrl).toMatch(/^\/demo-register-assets\/psa-.+-real\.jpg$/);
      expect(asset.cardImageUrl).toMatch(/^https:\/\/images\.pokemontcg\.io\/.+_hires\.png$/);
      expect(asset.sourceUrl).toMatch(/^https:\/\//);
      expect(psaCertUrl(asset.certNumber)).toBe(`https://www.psacard.com/cert/${asset.certNumber}`);
      expect(PSA_FIXTURES[asset.certNumber]?.cardLabel).toBe(asset.cardLabel);
      expect(
        mintedImageUrlForRegistration({
          cardLabel: asset.cardLabel,
          images: [{ side: "front", data: asset.imageUrl, mime: "image/jpeg" }],
          psaRecord: PSA_FIXTURES[asset.certNumber],
        }),
      ).toBe(asset.cardImageUrl);
    }
  });

  it("approves every sample through the authentication gate", async () => {
    for (const asset of REGISTER_DEMO_ASSETS) {
      const images: SlabImage[] = [{ side: "front", data: asset.imageUrl, mime: "image/jpeg" }];
      const result = await runAuthentication({ images, declaredCertNumber: asset.certNumber });
      expect(result.verdict, asset.id).toBe("approved");
      expect(result.psaResolved, asset.id).toBe(true);
      expect(result.identityMatch, asset.id).toBe(true);
      expect(result.gradeMatch, asset.id).toBe(true);
    }
  });
});
