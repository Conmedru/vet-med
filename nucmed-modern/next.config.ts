import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Covers are 1344×768 (~220 KB) in S3: the optimizer serves WebP at the size each slot needs
    // (a 96px feed thumbnail no longer downloads the full picture). Only our bucket: an open
    // remotePatterns "**" would turn /_next/image into a proxy for any host.
    // s3.twcstorage.ru is shared by all Timeweb customers: our bucket only (its name is public in cover URLs)
    remotePatterns: [{ protocol: "https", hostname: "s3.twcstorage.ru", pathname: "/1873f82d-617b-4505-a1ec-3fe47ebe0e64/**" }],
    // WebP only: AVIF encodes about twice as long, and the cache starts empty after every deploy
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    // A replaced cover gets a new file name (lib/ai/process-article.ts), so long caching is safe
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
