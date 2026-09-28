import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF where the browser takes it, WebP otherwise.
    formats: ["image/avif", "image/webp"],
    // A month. A picture that changes gets a new address, so nothing goes stale.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // ponytail: any ?v= is accepted, so someone could fill the cache with made-up
    // versions. List exact versions here if that ever shows up on the bill.
    localPatterns: [{ pathname: "/cards/**" }, { pathname: "/assets/**" }],
  },
};

export default nextConfig;
