"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, SquarePlus } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** In sessionStorage once closed, so it asks once a visit; in localStorage once ticked off for good. */
const KEY = "home-screen-prompt";
const STEP = "flex items-center gap-2 rounded-2xl bg-cosmos-700/60 px-4 py-3 ring-2 ring-cosmos-500 ring-inset";

/** An iPhone still in the browser: the only place the prompt is any use. */
export function onIphoneBrowser(userAgent: string, standalone: boolean) {
  return /iphone|ipod/i.test(userAgent) && !standalone;
}

// Nothing changes it from outside; the dialog's own state takes over once it is answered.
const subscribe = () => () => {};

function wanted() {
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone = matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  try {
    return onIphoneBrowser(nav.userAgent, standalone) && !localStorage.getItem(KEY) && !sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/**
 * Asks an iPhone player to add the game to their Home Screen, once a visit,
 * until they tick "Don't show this again". Nothing on any other device.
 */
export function AddToHomeScreen() {
  const open = useSyncExternalStore(subscribe, wanted, () => false);
  const [answered, setAnswered] = useState(false);

  function close() {
    setAnswered(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
  }

  function toggleHidden(checked: boolean) {
    try {
      if (checked) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {}
  }

  return (
    <Dialog open={open && !answered} onOpenChange={close}>
      <DialogContent className="theme-cosmos dark gap-4 border-2 border-gold-400 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-black tracking-widest text-gold-400 uppercase">
            Add to your Home Screen
          </DialogTitle>
          <DialogDescription className="text-sm text-white/70">
            Opens full screen like an app, with no browser bars over the board.
          </DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-2 text-sm">
          <li className={STEP}>
            <span className="font-black text-gold-400">1</span>
            Tap <Share className="size-5 text-gold-200" /> <b>Share</b> in the browser bar
          </li>
          <li className={STEP}>
            <span className="font-black text-gold-400">2</span>
            Tap <SquarePlus className="size-5 text-gold-200" /> <b>Add to Home Screen</b>
          </li>
        </ol>
        <label className="mx-auto flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input type="checkbox" onChange={(e) => toggleHidden(e.target.checked)} className="size-4 accent-gold-400" />
          Don&apos;t show this again
        </label>
        <button
          type="button"
          onClick={close}
          className="flex h-12 items-center justify-center rounded-full bg-cosmos-700 text-base font-bold ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-500 focus-visible:ring-gold-400"
        >
          Got it
        </button>
      </DialogContent>
    </Dialog>
  );
}
