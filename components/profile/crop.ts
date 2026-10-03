/** The crop's arithmetic, kept apart from the screen so it can be checked on its own. */

export interface CropView {
  /** The picture's natural size. */
  width: number;
  height: number;
  /** The round viewport's side, in the same units the offset is dragged in. */
  size: number;
  /** 1 fills the viewport with the picture's shorter side; more zooms in. */
  zoom: number;
  /** How far the picture's centre has been dragged from the viewport's, in viewport units. */
  x: number;
  y: number;
}

/** Viewport units per picture pixel. */
export const scaleOf = (c: CropView) => (c.size / Math.min(c.width, c.height)) * c.zoom;

/** The offset pulled back so the picture still covers the whole viewport. */
export function clampOffset(c: CropView): { x: number; y: number } {
  const s = scaleOf(c);
  const slackX = Math.max(0, (c.width * s - c.size) / 2);
  const slackY = Math.max(0, (c.height * s - c.size) / 2);
  return { x: Math.min(slackX, Math.max(-slackX, c.x)), y: Math.min(slackY, Math.max(-slackY, c.y)) };
}

/** The square of the picture, in its own pixels, that the viewport shows. */
export function cropRect(c: CropView): { sx: number; sy: number; side: number } {
  const s = scaleOf(c);
  const { x, y } = clampOffset(c);
  const side = c.size / s;
  return { sx: (c.width - side) / 2 - x / s, sy: (c.height - side) / 2 - y / s, side };
}
