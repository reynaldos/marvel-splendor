import { pageMetadata } from "@/lib/site";

import { PackPreview } from "./PackPreview";

export const metadata = pageMetadata("Pack opening preview", undefined, true);

// A page for watching a pack open without buying one. ?pack= opens that one straight away. Nothing is read or saved.
export default async function PackPreviewPage({ searchParams }: { searchParams: Promise<{ pack?: string }> }) {
  return <PackPreview open={(await searchParams).pack} />;
}
