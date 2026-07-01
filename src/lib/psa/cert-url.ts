const PSA_CERT_BASE_URL = "https://www.psacard.com/cert";

export function psaCertUrl(certNumber: string | null | undefined): string | null {
  const normalized = certNumber?.replace(/\D/g, "");
  return normalized ? `${PSA_CERT_BASE_URL}/${normalized}` : null;
}
