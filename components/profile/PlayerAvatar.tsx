import { cn } from "cn";

import { AssetImage } from "@/components/game/assets";
import { AVATAR_LIBRARY } from "@/lib/avatars";

/** "Rey Sanchez" is RS and "Bot 1" is B1; a single word gives its first two letters. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A player's picture in a gold ring, or their initials when they have none. Size it with `size-*`. */
export function PlayerAvatar({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cosmos-700 font-bold text-gold-200 ring-2 ring-gold-400",
        className,
      )}
    >
      {src?.startsWith("/") ? (
        <AssetImage src={src} alt="" sizes="15vw" className={AVATAR_LIBRARY.find((a) => a.src === src)?.fit} />
      ) : src ? (
        // An uploaded picture lives on another host, which the image resizer isn't set up for.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
