import { HowToPlay } from "@/components/home/HowToPlay";
import { Stage } from "@/components/Stage";
import { pageMetadata } from "@/lib/site";

import { PreviewMenu } from "../PreviewBar";

export const metadata = pageMetadata("How to play preview", undefined, true);

// The how-to-play slideshow without signing in. ?slide= opens it on that slide.
export default async function HowToPreviewPage({ searchParams }: { searchParams: Promise<{ slide?: string }> }) {
  const slide = Number((await searchParams).slide);
  return (
    <Stage className="justify-center">
      <HowToPlay preview={slide >= 1 ? slide - 1 : undefined} />
      <PreviewMenu />
    </Stage>
  );
}
