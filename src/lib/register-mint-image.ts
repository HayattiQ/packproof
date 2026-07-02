import type { SlabImage } from "@/lib/http/responses";
import { cardArtForLabel } from "@/lib/packproof-data";
import type { PsaCertRecord } from "@/lib/psa/types";
import { REGISTER_DEMO_ASSETS } from "@/lib/register-demo-assets";

export function mintedImageUrlForRegistration({
  cardLabel,
  images,
  psaRecord,
}: {
  cardLabel: string | null | undefined;
  images: SlabImage[];
  psaRecord: PsaCertRecord | null | undefined;
}): string {
  const demoCardImage = REGISTER_DEMO_ASSETS.find(
    (asset) => asset.certNumber === psaRecord?.certNumber,
  )?.cardImageUrl;
  if (isDisplayableAssetUrl(demoCardImage)) return demoCardImage;

  const registryImage = psaRecord?.referenceImageUrls.find(isDisplayableAssetUrl);
  if (registryImage) return registryImage;

  const submittedFront = images.find(
    (image) => image.side.toLowerCase() === "front" && isDisplayableAssetUrl(image.data),
  )?.data;
  if (submittedFront) return submittedFront;

  return cardArtForLabel(cardLabel);
}

function isDisplayableAssetUrl(value: string | null | undefined): value is string {
  if (!value || value.includes("example.invalid")) return false;
  if (value.startsWith("/") || value.startsWith("data:image/")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost");
  } catch {
    return false;
  }
}
