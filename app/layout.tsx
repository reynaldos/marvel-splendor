import type { Metadata, Viewport } from "next";
import { Gelasio, Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";

import { RotateCw } from "lucide-react";

import { LAUNCH_IMAGES } from "@/lib/launch-images";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl, THEME_COLOR } from "@/lib/site";
import { AppWindow } from "@/components/AppWindow";
import { LaunchArt } from "@/components/LaunchArt";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

// The lettering of "Splendor". Shipped with the app, so it is the same on every device.
const gelasio = Gelasio({
  variable: "--font-gelasio",
  subsets: ["latin"],
  weight: "700",
  style: "italic",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, siteName: SITE_NAME, type: "website" },
  twitter: { title: SITE_NAME, description: SITE_DESCRIPTION, card: "summary_large_image" },
  appleWebApp: {
    title: SITE_NAME,
    capable: true,
    statusBarStyle: "black-translucent",
    // Shown while the installed app opens, in place of a blank screen.
    startupImage: LAUNCH_IMAGES,
  },
  // Older iPhones read this tag, not the manifest, to open full screen.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  // Draw under the notch margins; the screens pad their content back out.
  viewportFit: "cover",
  // A stray pinch or double tap mid-game would zoom the board.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${gelasio.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <AppWindow />
            {/* The installed app opens on the launch picture; this holds it a little longer, then fades. */}
            {/* ponytail: its pictures load in a browser tab too, where it is never shown. Draw it only once the page knows it is installed if that ever costs too much. */}
            <LaunchArt className="launch-splash pointer-events-none fixed inset-0 z-[110] hidden [@media(display-mode:standalone)]:flex" />
            {children}
            {/* Every screen is laid out for landscape; a phone held upright is asked to turn. */}
            <div className="fixed inset-0 z-[100] hidden flex-col items-center justify-center gap-4 bg-cosmos p-6 text-center font-display text-sm font-bold tracking-wide text-gold-400 uppercase portrait:max-md:flex">
              <RotateCw className="size-10" />
              Rotate your device to play
            </div>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
