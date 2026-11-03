import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/** The game's round button: gold to go ahead, dark to step back, red for what can't be undone. */
const pillVariants = cva(
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 font-display text-sm font-black tracking-wide whitespace-nowrap uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-400 disabled:pointer-events-none disabled:bg-cosmos-700 disabled:text-cosmos-300 disabled:ring-0",
  {
    variants: {
      tone: {
        gold: "bg-gold-400 text-cosmos-950 hover:bg-gold-200",
        dark: "bg-cosmos-700 text-white ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500",
        red: "bg-marvel text-white hover:bg-red-500",
      },
    },
    defaultVariants: { tone: "dark" },
  },
);

function Pill({
  className,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof pillVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp type={asChild ? undefined : "button"} data-slot="pill" className={cn(pillVariants({ tone }), className)} {...props} />;
}

export { Pill };
