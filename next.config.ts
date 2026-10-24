import type { NextConfig } from "next";

// Uploaded pictures live in storage on another host; served through the resizer they are this site's own, which the
// shader frames need to draw them. Nothing is listed without storage set up.
const storage = process.env.R2_PUBLIC_BASE_URL ? [new URL(`${process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/**`)] : [];

const nextConfig: NextConfig = {
  images: {
    // AVIF where the browser takes it, WebP otherwise.
    formats: ["image/avif", "image/webp"],
    // A month. A picture that changes gets a new address, so nothing goes stale.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // ponytail: any ?v= is accepted, so someone could fill the cache with made-up
    // versions. List exact versions here if that ever shows up on the bill.
    localPatterns: [{ pathname: "/cards/**" }, { pathname: "/assets/**" }],
    remotePatterns: storage,
  },
};

export default nextConfig;
