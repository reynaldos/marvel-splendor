import { Stage } from "@/components/Stage";
import { ALL_CARDS } from "@/lib/engine/data";
import { pageMetadata } from "@/lib/site";

import { PreviewMenu } from "../PreviewBar";
import { FoilDemo } from "./FoilDemo";

export const metadata = pageMetadata("Foil preview", undefined, true);

/** Ten level-3 cards with art, one for each tier. */
const CARDS = ALL_CARDS.filter((c) => c.image && c.level === 3).slice(0, 10);

/** Every tier's frame as the shader draws it. `?tilt=x,y` (each -1..1) holds the light still, for a screenshot. */
export default async function FoilPreviewPage({ searchParams }: { searchParams: Promise<{ tilt?: string }> }) {
  const [x, y] = ((await searchParams).tilt ?? "").split(",").map(Number);
  const tilt = Number.isFinite(x) && Number.isFinite(y) ? ([x, y] as [number, number]) : undefined;
  return (
    <Stage>
      <div className="flex h-100 w-full flex-col justify-center px-4">
        <FoilDemo cards={CARDS} tilt={tilt} />
      </div>
      <PreviewMenu />
    </Stage>
  );
}
