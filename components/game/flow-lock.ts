/**
 * One flow at a time touches the board. A refresh that finds it busy is
 * skipped; a move that finds it busy waits, and takes the lock over as the
 * flow ends, instead of being dropped. One move can wait at a time.
 */
export function flowLock() {
  let held = false;
  let waiting: (() => void) | null = null;
  return {
    /** True if the lock was free and is now held. */
    take(): boolean {
      if (held) return false;
      return (held = true);
    },
    /** Resolves once the lock is held; null if a move is already waiting for it. */
    wait(): Promise<void> | null {
      if (!held) {
        held = true;
        return Promise.resolve();
      }
      if (waiting) return null;
      return new Promise((go) => (waiting = go));
    },
    /** Hands the lock to a waiting move, or frees it: true when freed. */
    release(): boolean {
      const next = waiting;
      waiting = null;
      if (next) {
        next();
        return false;
      }
      held = false;
      return true;
    },
  };
}
