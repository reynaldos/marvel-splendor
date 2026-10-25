import { pageMetadata } from "@/lib/site";

import { PreviewMenu } from "../PreviewBar";
import { DuelPreview } from "./DuelPreview";

export const metadata = pageMetadata("Duel board preview", undefined, true);

// A look at how a Duel table could be laid out. Made up; nothing plays, nothing is read or saved.
export default function DuelPreviewPage() {
  return (
    <>
      <DuelPreview />
      <PreviewMenu />
    </>
  );
}
