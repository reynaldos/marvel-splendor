import { pageMetadata } from "@/lib/site";

import { FriendsPreview } from "./FriendsPreview";

export const metadata = pageMetadata("Friends preview", undefined, true);

// Every friends screen with made-up players, without signing in. Nothing is read or saved.
export default async function FriendsPreviewPage({ searchParams }: { searchParams: Promise<{ tab?: string; state?: string; show?: string }> }) {
  const { tab, state, show } = await searchParams;
  const query = new URLSearchParams(Object.entries({ tab, state, show }).filter((entry): entry is [string, string] => !!entry[1])).toString();
  const here = query ? `/preview/friends?${query}` : "/preview/friends";
  // Keyed by the address, so moving between views starts a fresh fake store.
  return <FriendsPreview key={here} tab={tab} empty={state === "empty"} show={show} here={here} />;
}
