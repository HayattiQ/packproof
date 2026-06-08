import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // sharp is used lazily by the real perceptual-hash image-match adapter
  // (PACKPROOF_ADAPTERS includes "phash"). Keep it external so Next does not
  // try to bundle the native binary into server output.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
