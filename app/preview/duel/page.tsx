import { pageMetadata } from "@/lib/site";

import { DuelPreview } from "./DuelPreview";

export const metadata = pageMetadata("Duel board preview", undefined, true);

// The Duel board on a made-up table. `?show=` opens one of the turn's choices. Nothing is read or saved.
export default async function DuelPreviewPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  return <DuelPreview show={show} />;
}
