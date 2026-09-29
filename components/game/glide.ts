/** True for anyone who has asked their device for less motion. */
export function lessMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Carries a piece to where it is drawn from where it was: `from`, its place
 * and size on the board. With nowhere to come from it grows out of its own
 * middle. Cancel what is returned if it is set up again.
 */
export function glideFrom(piece: HTMLElement, from: DOMRect | null, duration: number): Animation | null {
  if (lessMotion()) return null;
  const here = piece.getBoundingClientRect();
  return piece.animate(
    [
      {
        transform: from
          ? `translate(${from.x + from.width / 2 - (here.x + here.width / 2)}px, ${from.y + from.height / 2 - (here.y + here.height / 2)}px) scale(${Math.min(from.width / here.width, from.height / here.height)})`
          : "scale(0.3)",
      },
      { transform: "none" },
    ],
    { duration, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "backwards" },
  );
}
