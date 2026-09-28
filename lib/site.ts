import type { Metadata } from "next";

/** The galaxy background's darkest blue, for the phone's bars and the launch screen. */
export const THEME_COLOR = "#070b2a";

export const SITE_NAME = "Marvel Splendor";
export const SITE_DESCRIPTION =
  "Recruit heroes, gather the Infinity Stones, assemble the Avengers and claim the Gauntlet. Play the computer or a private game with friends.";

/** The picture shown with every shared link. */
const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Marvel Splendor: the main menu, with hero cards and the Avengers Assemble tile",
};

/** Where the site lives, so share images and links are full addresses. */
export function siteUrl(): URL {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return new URL(process.env.APP_BASE_URL ?? (vercel ? `https://${vercel}` : "http://localhost:3000"));
}

/**
 * A page's title and description, repeated for link previews. Pages behind a
 * sign-in pass `hidden` to stay out of search results.
 */
export function pageMetadata(title: string, description = SITE_DESCRIPTION, hidden = false): Metadata {
  // A page that sets its own preview details has to name the image again, or it is dropped.
  const shared = { title: `${title} | ${SITE_NAME}`, description, images: SHARE_IMAGE };
  return {
    title,
    description,
    openGraph: { ...shared, siteName: SITE_NAME, type: "website" },
    twitter: { ...shared, card: "summary_large_image" },
    ...(hidden ? { robots: { index: false, follow: false } } : {}),
  };
}
