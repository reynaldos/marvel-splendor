import type { MouseEventHandler } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** The way back, bottom left of a menu screen. */
export function BackLink({
  href = "/",
  onClick,
}: {
  href?: string;
  /** Call `preventDefault` to hold the player on the page. */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 text-base font-bold hover:text-gold-200">
      <span className="flex size-11 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset">
        <ArrowLeft className="size-6" />
      </span>
      Back
    </Link>
  );
}
