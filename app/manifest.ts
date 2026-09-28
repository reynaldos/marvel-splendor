import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR } from "@/lib/site";

// What the phone uses when the site is added to the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Splendor",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    // No browser bars: the game gets the whole screen.
    display: "standalone",
    orientation: "landscape",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
