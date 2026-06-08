import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config: no R2 incremental cache (the app is dynamic; nothing to cache
// across requests that warrants a bucket). Add an incrementalCache override later
// if ISR/SSG caching is introduced.
export default defineCloudflareConfig();
