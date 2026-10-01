"use client";

import { Toggle } from "@/components/Toggle";
import { setAudioPref, useAudioPrefs } from "@/components/audio";

/** Music and sounds on or off, side by side. Goes in any menu. */
export function SoundToggles() {
  const { bgm, sfx } = useAudioPrefs();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Toggle on={bgm} onChange={(on) => setAudioPref({ bgm: on })} label="Music" />
      <Toggle on={sfx} onChange={(on) => setAudioPref({ sfx: on })} label="Sounds" />
    </div>
  );
}
