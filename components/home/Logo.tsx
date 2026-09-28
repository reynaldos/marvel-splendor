import { cn } from "cn";

/** The game's name as on the box. Size it with a text size class. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col items-center leading-none", className)}>
      <span className="font-serif text-[1em] font-bold text-gold italic">Splendor</span>
      <span className="mt-[0.15em] bg-marvel px-[0.3em] py-[0.05em] text-[0.55em] font-black tracking-tighter text-white">
        MARVEL
      </span>
    </span>
  );
}
