"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fetches the page's numbers again every so often, keeping the chosen tab and
 * the place scrolled to. It rests while the tab is out of sight, and catches
 * up the moment it is looked at again.
 */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  return null;
}
