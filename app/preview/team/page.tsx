import { Stage } from "@/components/Stage";
import { ALL_CARDS } from "@/lib/engine/data";
import { pageMetadata } from "@/lib/site";
import { dealTeam, squadSetting } from "@/lib/squad-settings";

import { PreviewMenu } from "../PreviewBar";
import { SquadPicDemo } from "./SquadPicDemo";

export const metadata = pageMetadata("Squad pic preview", undefined, true);

// A demo of the squad pic: a team drawn by an image model. ?name= puts a name in the heading.
export default async function SquadPicPage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name } = await searchParams;
  const pictured = ALL_CARDS.filter((c) => c.image);
  const team = dealTeam(pictured);
  return (
    <Stage>
      <div className="flex h-100 w-full flex-col gap-3 px-4 pt-4 pb-4">
        <h1 className="font-display text-xl font-black tracking-[0.3em] text-gold-400 uppercase">
          {name ? `${name}'s squad pic` : "Your squad pic"}
        </h1>
        <div className="min-h-0 flex-1">
          <SquadPicDemo cards={pictured} initial={team} initialSetting={squadSetting(team)} />
        </div>
      </div>
      <PreviewMenu />
    </Stage>
  );
}
