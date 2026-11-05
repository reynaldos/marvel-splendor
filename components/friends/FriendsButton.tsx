import Link from "next/link";
import { Users } from "lucide-react";

import { NewDot } from "@/components/UpdateLog";

/** The round Friends button on the home screen, with a gold dot while requests wait for the player. */
export function FriendsButton({ waiting }: { waiting: number }) {
  return (
    <Link
      href="/friends"
      aria-label="Friends"
      className="relative flex size-14 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-500 focus-visible:ring-gold-400"
    >
      <Users className="size-6" />
      {waiting > 0 ? <NewDot label={waiting === 1 ? "1 friend request waiting" : `${waiting} friend requests waiting`} className="absolute top-0 right-0" /> : null}
    </Link>
  );
}
