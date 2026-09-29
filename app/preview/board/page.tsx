import { pageMetadata } from "@/lib/site";

import { BoardPreview } from "./BoardPreview";

export const metadata = pageMetadata("Board animations preview", undefined, true);

// A page for looking at the board's animations without playing a game. Its table is made up; nothing is read or saved.
export default async function BoardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; at?: string }>;
}) {
  const { show, at } = await searchParams;
  return <BoardPreview show={show} at={at === undefined ? undefined : Number(at)} />;
}
