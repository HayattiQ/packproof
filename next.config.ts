import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // sharp is used lazily by the real perceptual-hash image-match adapter
  // (PACKPROOF_ADAPTERS includes "phash"). Keep it external so Next does not
  // try to bundle the native binary into server output.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;

// Integrates the Next.js dev server with the OpenNext Cloudflare adapter
// (enables local access to Worker bindings). No-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
