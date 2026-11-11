"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // Drawn like the game's dialogs: night sky behind, gold edge, bold white text.
      // The top-centre group holds the friend notices: wider, for a name, a line and two buttons on one row.
      className="toaster group theme-cosmos dark data-[y-position=top]:[--width:30rem]!"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--color-cosmos-900)",
          "--normal-text": "#fff",
          "--normal-border": "var(--color-gold-400)",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Plain toasts only; a custom one (the friend notices) draws its own frame.
          toast: "cn-toast data-[styled=true]:border-2! data-[styled=true]:font-bold data-[styled=true]:shadow-lg [&_[data-icon]]:text-gold-400",
          description: "text-cosmos-300!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
