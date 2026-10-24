import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "cn";

import { AssetImage } from "@/components/game/assets";
import { AVATAR_LIBRARY } from "@/lib/avatars";
import { FRAME_EFFECT, FRAME_STYLE, type FrameTier } from "@/lib/frame-tier";

/** "Rey Sanchez" is RS and "Bot 1" is B1; a single word gives its first two letters. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A player's picture in a blue ring, or their initials when they have none. Size it with `size-*`.
 * With `tier`, the ring is that tier's frame, with the same light over the picture as over a card,
 * turned well down so the face stays the point; `plain` leaves the face alone and keeps only the border
 * and glow, as on the leaderboard. A `FoilLayer` on the screen draws that frame in the shader over the
 * CSS one.
 */
const FACE_OPACITY = { "--face-opacity": 0.25 } as CSSProperties;

export function PlayerAvatar({
  src,
  name,
  className,
  tier,
  plain,
}: {
  src: string | null;
  name: string;
  className?: string;
  tier?: FrameTier;
  plain?: boolean;
}) {
  return (
    <span
      style={tier && { ...FRAME_STYLE[tier], ...FACE_OPACITY }}
      data-foil={tier}
      data-foil-round={tier ? "" : undefined}
      data-foil-quiet={tier && !plain ? "" : undefined}
      data-foil-plain={tier && plain ? "" : undefined}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cosmos-700 font-bold text-gold-200",
        tier ? cn("frame-gold", FRAME_EFFECT[tier]) : "ring-2 ring-cosmos-500",
        className,
      )}
    >
      {src?.startsWith("/") ? (
        <AssetImage src={src} alt="" sizes="15vw" className={AVATAR_LIBRARY.find((a) => a.src === src)?.fit} />
      ) : src ? (
        // An uploaded picture, from storage on another host: through the resizer it is this site's own, so the shader can draw it.
        <Image src={src} alt="" fill sizes="15vw" className="object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
