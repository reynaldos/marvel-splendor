import { cn } from "cn";

import { StackedArt } from "@/components/home/art";
import { Logo } from "@/components/home/Logo";

/**
 * What an installed app opens on: Thanos over the game's name, with the
 * stones adrift all round. Each way up has its own layout, and the launch
 * pictures are photographs of it.
 */
export function LaunchArt({ className }: { className?: string }) {
  return (
    <div className={cn("stage dark overflow-hidden bg-cosmos", className)}>
      <div className="relative h-100 w-full self-center portrait:hidden">
        <StackedArt>
          <Logo className="text-[calc(var(--spacing)*14)]" />
        </StackedArt>
      </div>
      <div className="relative hidden size-full portrait:block">
        <StackedArt upright>
          <Logo className="text-[calc(var(--spacing)*30)]" />
        </StackedArt>
      </div>
    </div>
  );
}
