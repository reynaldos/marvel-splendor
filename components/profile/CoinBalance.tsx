import { cn } from "cn";
import { Coins } from "lucide-react";

const BADGE = "flex h-7 items-center gap-1.5 rounded-full bg-cosmos-900 px-3 text-xs font-black ring-2 ring-cosmos-500 ring-inset";

interface CoinBalanceProps {
  balance: number;
  className?: string;
}

/** A player's coin balance, spent later in the shop. */
export function CoinBalance({ balance, className }: CoinBalanceProps) {
  return (
    <span className={cn(BADGE, "text-gold-400", className)}>
      <Coins className="size-4" />
      {balance.toLocaleString()}
    </span>
  );
}
