import { cn } from "cn";
import { RotateCw } from "lucide-react";

import { StackedArt } from "@/components/home/art";
import { Logo } from "@/components/home/Logo";

/**
 * What an installed app opens on: Thanos over the game's name, with the
 * stones adrift all round. It is laid out for a phone on its side, and the
 * launch pictures are photographs of it.
 */
export function LaunchArt({ className }: { className?: string }) {
  return (
    <div className={cn("stage dark overflow-hidden bg-cosmos", className)}>
      <div className="relative h-100 w-full self-center">
        <StackedArt>
          <Logo className="text-[calc(var(--spacing)*14)]" />
        </StackedArt>
      </div>
    </div>
  );
}

/**
 * Shown over everything while a phone or tablet is held upright, as every
 * screen is laid out for landscape; a desktop window taller than wide is left
 * alone. It runs on past the bottom edge by the height of the status bar: an
 * installed iPhone app measures the screen that much short.
 */
export function RotateNotice() {
  return (
    <div className="stage dark fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-top,0px)*-1)] z-[100] hidden overflow-hidden bg-cosmos portrait:max-md:block portrait:pointer-coarse:block">
      <StackedArt upright>
        <div className="flex flex-col items-center gap-[calc(var(--spacing)*8)]">
          <Logo className="text-[calc(var(--spacing)*28)]" />
          <p className="flex items-center gap-[calc(var(--spacing)*3)] font-display text-[calc(var(--spacing)*7.5)] font-bold tracking-wide whitespace-nowrap text-gold-400 uppercase">
            <RotateCw className="size-[calc(var(--spacing)*11)]" />
            Rotate your device to play
          </p>
        </div>
      </StackedArt>
    </div>
  );
}
