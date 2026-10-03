"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cn } from "cn";

import { clampOffset, cropRect, scaleOf } from "@/components/profile/crop";

/** The side of the picture that is kept, in pixels. */
const OUT_PX = 512;
const MAX_ZOOM = 4;

/**
 * A chosen picture in a round frame: drag it into place and zoom with the slider, then keep
 * the part in view as a square. `onDone` gets that square as a JPEG, or null for cancel.
 */
export function CropPicture({ src, onDone, className }: { src: string; onDone: (file: File | null) => void; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  // The frame's side, measured, since it scales with the screen.
  const [size, setSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      image.current = img;
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const watch = new ResizeObserver(() => setSize(el.clientWidth));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const view = natural && size ? { ...natural, size, zoom, ...offset } : null;
  const shown = view ? clampOffset(view) : offset;

  const onPointerDown = (e: PointerEvent) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const { x, y } = drag.current;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + e.clientX - x, y: o.y + e.clientY - y }));
  };
  const onPointerUp = () => {
    drag.current = null;
    if (view) setOffset(clampOffset(view));
  };

  function keep() {
    if (!view || !image.current) return;
    const { sx, sy, side } = cropRect(view);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT_PX;
    canvas.getContext("2d")!.drawImage(image.current, sx, sy, side, side, 0, 0, OUT_PX, OUT_PX);
    canvas.toBlob((blob) => blob && onDone(new File([blob], "picture.jpg", { type: "image/jpeg" })), "image/jpeg", 0.9);
  }

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <div
        ref={frame}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative size-44 shrink-0 cursor-grab touch-none overflow-hidden rounded-full bg-cosmos-950 ring-4 ring-gold-400 select-none active:cursor-grabbing"
        aria-label="Drag to position your picture"
      >
        {view ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
            style={{
              width: view.width * scaleOf(view),
              height: view.height * scaleOf(view),
              transform: `translate(calc(-50% + ${shown.x}px), calc(-50% + ${shown.y}px))`,
            }}
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <label htmlFor="zoom" className="font-display text-base font-bold tracking-wide text-gold-400 uppercase">
          Zoom
        </label>
        <input
          id="zoom"
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-gold-400"
        />
        <p className="text-sm text-cosmos-300">Drag the picture to place it. What is inside the circle is kept.</p>
        <div className="flex gap-3">
          <button type="button" onClick={keep} disabled={!view} className="h-11 rounded-full bg-gold-400 px-6 text-base font-black text-cosmos-950 uppercase hover:bg-gold-200 disabled:bg-cosmos-700 disabled:text-cosmos-300">
            Use this
          </button>
          <button type="button" onClick={() => onDone(null)} className="h-11 rounded-full bg-cosmos-700 px-6 text-base font-black uppercase ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
