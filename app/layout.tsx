import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";

import { RotateCw } from "lucide-react";

import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
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

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, siteName: SITE_NAME, type: "website" },
  twitter: { title: SITE_NAME, description: SITE_DESCRIPTION, card: "summary_large_image" },
  appleWebApp: { title: SITE_NAME, capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#070b2a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
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
