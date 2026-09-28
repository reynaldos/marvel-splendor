"use client";

import { useState } from "react";
import { cn } from "cn";

import { AssetImage } from "@/components/game/assets";

// Left to right; the tilt fans them out and `left`/`top` are a share of the screen.
const HEROES = [
  { name: "Black Widow", src: "/cards/black-widow.png", left: 6, top: 24, tilt: -20 },
  { name: "Thor", src: "/cards/thor.png", left: 13, top: 17, tilt: -10 },
  { name: "Iron Man", src: "/cards/iron-man.png", left: 20, top: 13, tilt: 0 },
  { name: "Captain America", src: "/cards/captain-america.png", left: 27, top: 17, tilt: 10 },
  { name: "Hulk", src: "/cards/hulk.png", left: 33, top: 24, tilt: 20 },
];
const MIDDLE = 2;

/** A hand of heroes. Pointing at a card, or tapping it, pulls it to the front. */
export function HeroFan() {
  const [front, setFront] = useState(MIDDLE);

  return (
    <>
      {HEROES.map((hero, i) => (
        <button
          key={hero.name}
          type="button"
          aria-label={`Bring ${hero.name} to the front`}
          aria-pressed={i === front}
          onClick={() => setFront(i)}
          onPointerEnter={(e) => e.pointerType === "mouse" && setFront(i)}
          className={cn(
            "drift absolute aspect-card w-28 overflow-hidden rounded-lg shadow-lg ring-1 ring-black/40 transition-[rotate,scale] duration-300",
            i === front && "scale-115 ring-2 ring-gold-400",
          )}
          style={{
            left: `${hero.left}%`,
            top: `${hero.top}%`,
            // The front card stands upright; the rest stack outward from the middle.
            rotate: `${i === front ? 0 : hero.tilt}deg`,
            // One above the highest resting layer, or the middle card would tie with it and win.
            zIndex: i === front ? HEROES.length + 1 : HEROES.length - Math.abs(i - MIDDLE),
            animationDelay: `${-i * 1.3}s`,
          }}
        >
          <AssetImage src={hero.src} alt="" />
        </button>
      ))}
    </>
  );
}
