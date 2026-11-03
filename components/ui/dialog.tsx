"use client"

import * as React from "react"
import { cn } from "cn"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

/** How a popup lands: a short pop with a little overshoot, as the game's other pieces arrive. */
const POP =
  "duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-open:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:ease-in"
/** The box's gold frame round a popup, lit from behind. */
const FRAME =
  "frame-gold rounded-3xl p-5 [--frame-glow:rgb(246_201_69/0.3)] w-full max-w-[calc(100%-2rem)] sm:max-w-sm sm:p-6"
/** A popup that takes the whole screen: the night sky, no frame. */
const FULL = "inset-0 flex h-(--screen-h) w-dvw max-w-none flex-col items-center justify-center rounded-none bg-cosmos p-4"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/80 duration-200 min-h-(--screen-h) pointer-fine:supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * A popup in the cosmos theme: the gold frame in the middle of the screen, or
 * with `full` the whole screen. The close button is round and big enough for a
 * thumb; `showCloseButton={false}` leaves it out.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  full = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  full?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "theme-cosmos dark fixed z-50 grid gap-4 text-sm text-white outline-none",
          // Centred from both edges, not from the middle: a popup sized to fit its content then gets the whole width to fit in.
          full ? FULL : cn(FRAME, "inset-x-0 top-1/2 mx-auto -translate-y-1/2"),
          showCloseButton && "[&_[data-slot=dialog-header]]:pr-10",
          POP,
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-500 focus-visible:ring-gold-400"
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex gap-3", className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-display text-xl font-black tracking-wide text-gold-400 uppercase", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-white/70 *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
