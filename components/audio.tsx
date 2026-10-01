"use client";

import { useEffect, useSyncExternalStore } from "react";

import { BGM_TRACKS, SFX, type SfxName } from "@/lib/audio-tracks";

interface AudioPrefs {
  bgm: boolean;
  sfx: boolean;
  /** Which track plays; the shop will offer more. */
  track: (typeof BGM_TRACKS)[number]["id"];
}

const KEY = "audio";
const DEFAULTS: AudioPrefs = { bgm: true, sfx: true, track: BGM_TRACKS[0].id };
const watchers = new Set<() => void>();
let cached: AudioPrefs | null = null;

// ponytail: remembered on the device, not the account. A column on User if it must follow the player.
function read(): AudioPrefs {
  if (cached) return cached;
  let prefs = DEFAULTS;
  try {
    prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {}
  return (cached = prefs);
}

function subscribe(onChange: () => void) {
  watchers.add(onChange);
  return () => void watchers.delete(onChange);
}

export function setAudioPref(change: Partial<AudioPrefs>) {
  cached = { ...read(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {}
  watchers.forEach((tell) => tell());
}

/** The device's sound settings. */
export function useAudioPrefs(): AudioPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

const loaded = new Map<SfxName, HTMLAudioElement>();

/** Plays one of the game's sounds, if sounds are on. A missing file is silent, not an error. */
export function playSfx(name: SfxName) {
  if (typeof Audio === "undefined" || !read().sfx) return;
  let sound = loaded.get(name);
  if (!sound) {
    sound = new Audio(SFX[name]);
    loaded.set(name, sound);
  }
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

/**
 * Plays the background music on a loop while it is switched on. Browsers
 * only let it start after the player has touched the page, so it waits for
 * that if need be, and it rests while the tab is hidden.
 */
export function BgmPlayer() {
  const { bgm, track } = useAudioPrefs();
  useEffect(() => {
    if (!bgm) return;
    const src = BGM_TRACKS.find((t) => t.id === track)?.src ?? BGM_TRACKS[0].src;
    const music = new Audio(src);
    music.loop = true;
    const start = () => music.play().catch(() => {});
    const onGesture = () => {
      start();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    const onVisible = () => (document.hidden ? music.pause() : start());
    start();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      music.pause();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [bgm, track]);
  return null;
}
