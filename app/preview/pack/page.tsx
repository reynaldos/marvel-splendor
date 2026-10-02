import { pageMetadata } from "@/lib/site";

import { PackPreview } from "./PackPreview";

export const metadata = pageMetadata("Pack opening preview", undefined, true);

// A page for watching a pack open without buying one. Nothing is read or saved.
export default function PackPreviewPage() {
  return <PackPreview />;
}
