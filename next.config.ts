import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Card art is placehold.co placeholders per the project owner's
    // explicit instruction (see components/game/stone-colors.ts
    // `cardArtUrl`) — no real Marvel art is fetched.
    remotePatterns: [{ protocol: "https", hostname: "placehold.co" }],
  },
};

export default nextConfig;
