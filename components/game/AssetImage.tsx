"use client";

import { createContext, useContext, type ReactNode } from "react";
import Image from "next/image";
import { cn } from "cn";

import versions from "@/data/image-versions.json";

/** A picture's address with its fingerprint, so a changed picture is fetched afresh. */
export function versioned(src: string): string {
  const version = (versions as Record<string, string>)[src];
  return version ? `${src}?v=${version}` : src;
}

/** How wide pictures are drawn, as a share of the screen. Board pieces are at most 8%. */
const ImageSizes = createContext("8vw");

/** Wrap anything that draws its pictures large, such as a popup, so they load sharp. */
export function LargeImages({ sizes = "30vw", children }: { sizes?: string; children: ReactNode }) {
  return <ImageSizes value={sizes}>{children}</ImageSizes>;
}

/**
 * Art that fills its (positioned) parent. `sizes` is how wide it is drawn,
 * which picks the resolution to load; left out, it takes the size of the
 * board or popup it is in.
 */
export function AssetImage({
  src,
  alt,
  sizes,
  preload,
  lazy,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  /** For the one big picture a screen opens on: fetched before the page is even read. */
  preload?: boolean;
  /** For art that is usually hidden: not fetched until it is on screen. */
  lazy?: boolean;
  className?: string;
}) {
  const inherited = useContext(ImageSizes);
  return (
    <Image
      src={versioned(src)}
      alt={alt}
      fill
      sizes={sizes ?? inherited}
      // No screen scrolls, so every picture is in view from the start: nothing to defer.
      loading={lazy ? "lazy" : "eager"}
      preload={preload}
      className={cn("object-cover", className)}
      draggable={false}
    />
  );
}
