import { pageMetadata } from "@/lib/site";

import { ModalsPreview } from "./ModalsPreview";

export const metadata = pageMetadata("Popups preview", undefined, true);

// A page for opening every popup without signing in or playing. Nothing is read or saved.
export default function ModalsPreviewPage() {
  return <ModalsPreview />;
}
