"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Crop } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { AssetImage } from "@/components/game/assets";
import { CropPicture } from "@/components/profile/CropPicture";
import { FoilLayer, hasGyro, setMotionFrames, useMotionFrames } from "@/components/Foil";
import { ownFrame, PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { AVATAR_TYPES, checkAvatarFile, checkAvatarType, uploadAvatar } from "@/components/profile/upload-avatar";
import { Stage, StageRows } from "@/components/Stage";
import { Toggle } from "@/components/Toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AVATAR_LIBRARY } from "@/lib/avatars";
import type { FrameTier } from "@/lib/frame-tier";
import { checkUsername, NAME_MAX, USERNAME_MAX } from "@/lib/username";
import type { ProfileChanges, SaveState } from "@/app/settings/actions";

const HEADING = "font-display text-base font-bold tracking-wide text-gold-400 uppercase";
const PILL_BUTTON =
  "h-11 rounded-full px-6 text-base font-black uppercase disabled:bg-cosmos-700 disabled:text-cosmos-300";
const GOLD_BUTTON = cn(PILL_BUTTON, "bg-gold-400 text-cosmos-950 hover:bg-gold-200");
const BLUE_BUTTON = cn(PILL_BUTTON, "bg-cosmos-500 hover:bg-cosmos-300 hover:text-cosmos-950");
const BIG_BUTTON =
  "h-11 w-60 rounded-full bg-gold-400 indent-[0.025em] font-display text-base font-black tracking-wide text-cosmos-950 uppercase shadow-lg hover:bg-gold-200 disabled:bg-cosmos-700 disabled:text-cosmos-300";
const FIELD =
  "h-11 w-full rounded-full bg-cosmos-950 px-5 text-lg font-bold ring-2 ring-cosmos-500 outline-none ring-inset placeholder:text-cosmos-500 focus:ring-gold-400";
/** How long typing must pause before the username is looked up. */
const CHECK_DELAY_MS = 400;

/** A picture picked but not saved yet: one from the library, or a crop to upload with the full-size picture it was cut from. */
type Picked = { src: string; id: string } | { src: string; file: File; original: File };

interface SettingsScreenProps {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  /** The frame their level has earned, shown on the picture as the two switches say. */
  avatarTier: FrameTier;
  xpAvatarStyle: boolean;
  xpCardStyle: boolean;
  /** Set when an admin is editing another player's profile: their username. */
  forUser: string | null;
  onCheckUsername: (typed: string, forUser: string | null) => Promise<SaveState>;
  onSave: (changes: ProfileChanges, forUser: string | null) => Promise<SaveState>;
}

/**
 * Where a player changes their picture, name, username and level frames. Nothing is kept until
 * Save. The picture is changed on its own view, reached from Edit, which comes back here.
 */
export function SettingsScreen({
  username,
  name: savedName,
  avatarUrl,
  avatarTier,
  xpAvatarStyle,
  xpCardStyle,
  forUser,
  onCheckUsername,
  onSave,
}: SettingsScreenProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(username);
  const [fullName, setFullName] = useState(savedName ?? "");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [xpAvatar, setXpAvatar] = useState(xpAvatarStyle);
  // The tilt switch is only offered where a phone can report its tilt, which is known only in the browser.
  const motion = useMotionFrames();
  const tiltable = useSyncExternalStore(() => () => {}, hasGyro, () => false);
  const [xpCard, setXpCard] = useState(xpCardStyle);
  const [editingPicture, setEditingPicture] = useState(false);
  // A picture open in the circle to be placed: a file just chosen, or the saved original fetched from here.
  const [cropping, setCropping] = useState<{ src: string; file: File | null } | null>(null);
  // What the server said about the username last looked up.
  const [looked, setLooked] = useState<{ name: string; result: SaveState } | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveState | null>(null);
  // Stopped on the way out, for unsaved changes.
  const [leaving, setLeaving] = useState(false);

  const typed = name.trim().toLowerCase();
  const nameChanged = typed !== username;
  const unsaved =
    nameChanged ||
    picked !== null ||
    fullName.trim() !== (savedName ?? "") ||
    xpAvatar !== xpAvatarStyle ||
    xpCard !== xpCardStyle;
  const shape = checkUsername(name);
  const shown = picked?.src ?? avatarUrl;
  // What the crop button reopens: the pending upload's original, or the saved original served from here. Library pictures aren't cut.
  const adjustable: { src: string; file: File | null } | null = picked
    ? "original" in picked
      ? { src: URL.createObjectURL(picked.original), file: picked.original }
      : null
    : avatarUrl && !avatarUrl.startsWith("/")
      ? { src: `/api/avatar/current${forUser ? `?user=${forUser}` : ""}`, file: null }
      : null;

  useEffect(() => {
    if (!nameChanged || "error" in checkUsername(typed)) return;
    let current = true;
    const timer = setTimeout(async () => {
      const found = await onCheckUsername(typed, forUser).catch(() => null);
      if (current && found) setLooked({ name: typed, result: found });
    }, CHECK_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [typed, nameChanged, onCheckUsername, forUser]);

  const nameNote: SaveState | null = !nameChanged
    ? null
    : "error" in shape
      ? { ok: false, message: shape.error }
      : looked?.name === typed
        ? looked.result
        : { ok: true, message: "Checking…" };
  const nameIsFree = !nameChanged || (looked?.name === typed && looked.result.ok);

  function pick(next: Picked) {
    setResult(null);
    setPicked(next);
  }

  function set<T>(setter: (value: T) => void) {
    return (value: T) => {
      setResult(null);
      setter(value);
    };
  }

  async function save() {
    setSaving(true);
    setResult(null);
    try {
      const saved = await onSave(
        {
          username: typed,
          name: fullName,
          avatarId: picked && "id" in picked ? picked.id : null,
          xpAvatarStyle: xpAvatar,
          xpCardStyle: xpCard,
        },
        forUser,
      );
      if (saved.ok && picked && "file" in picked) await uploadAvatar(picked.file, picked.original, forUser);
      // Saved: on to the profile, under whatever the username is now.
      if (saved.ok) router.push(`/profile/${typed}`);
      else setResult(saved);
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  const holdIfUnsaved = (event: MouseEvent) => {
    if (!unsaved) return;
    event.preventDefault();
    setLeaving(true);
  };

  // One skeleton for both views, so the picture, its button and the footer's button stay where they are.
  return (
    <Stage>
      <StageRows>
        <div className="flex items-center justify-center gap-10">
          <div className="flex w-40 flex-col items-center gap-3">
            <span className="relative">
              <FoilLayer />
              <PlayerAvatar
                src={shown}
                name={typed || username}
                {...ownFrame(avatarTier, xpAvatar, xpCard)}
                className="size-28 text-4xl"
              />
              {adjustable ? (
                <button
                  type="button"
                  aria-label="Adjust picture"
                  disabled={saving || cropping !== null}
                  onClick={() => {
                    setEditingPicture(true);
                    setCropping(adjustable);
                  }}
                  // Centred on the corner of the picture's box, which a circle leaves empty, so it never covers the face.
                  className="absolute top-0 right-0 flex size-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500 disabled:opacity-60"
                >
                  <Crop className="size-4" />
                </button>
              ) : null}
            </span>
            <input
              ref={fileInput}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const problem = checkAvatarType(file);
                if (problem) setResult({ ok: false, message: problem });
                else setCropping({ src: URL.createObjectURL(file), file });
              }}
            />
            <button
              type="button"
              disabled={saving || cropping !== null}
              onClick={() => (editingPicture ? fileInput.current?.click() : setEditingPicture(true))}
              className={BLUE_BUTTON}
            >
              {editingPicture ? "Upload" : "Edit"}
            </button>
          </div>

          <div className="flex w-130 flex-col gap-3">
            {cropping ? (
              <>
                <h2 className={HEADING}>Place your picture</h2>
                <CropPicture
                  src={cropping.src}
                  onDone={async (file) => {
                    const from = cropping;
                    setCropping(null);
                    if (!file) return;
                    // A saved picture's original comes back from the server, to go up again with the new crop.
                    let original = from.file;
                    if (!original) {
                      const blob = await fetch(from.src).then((res) => res.blob());
                      original = new File([blob], "original", { type: blob.type });
                    }
                    const problem = checkAvatarFile(file) ?? checkAvatarFile(original);
                    if (problem) setResult({ ok: false, message: problem });
                    else pick({ src: URL.createObjectURL(file), file, original });
                  }}
                />
              </>
            ) : editingPicture ? (
              <>
                <h2 className={HEADING}>Or choose a picture</h2>
                <div className="grid grid-cols-9 gap-2">
                  {AVATAR_LIBRARY.map((picture) => (
                    <button
                      key={picture.id}
                      type="button"
                      aria-label={picture.label}
                      aria-pressed={shown === picture.src}
                      disabled={saving}
                      onClick={() => pick({ src: picture.src, id: picture.id })}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-full ring-2 ring-cosmos-500 hover:ring-gold-200",
                        shown === picture.src && "ring-4 ring-gold-400",
                      )}
                    >
                      <AssetImage src={picture.src} alt="" className={picture.fit} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-2">
                    <label htmlFor="username" className={HEADING}>
                      Username
                    </label>
                    <input
                      id="username"
                      value={name}
                      onChange={(event) => set(setName)(event.target.value)}
                      maxLength={USERNAME_MAX}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-describedby="username-note"
                      aria-invalid={nameNote ? !nameNote.ok : undefined}
                      className={FIELD}
                    />
                    <p
                      id="username-note"
                      aria-live="polite"
                      className={cn("h-4 px-5 text-xs font-bold", nameNote?.ok ? "text-gold-200" : "text-red-300")}
                    >
                      {nameNote?.message}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <label htmlFor="name" className={HEADING}>
                      Name
                    </label>
                    <input
                      id="name"
                      value={fullName}
                      onChange={(event) => set(setFullName)(event.target.value)}
                      maxLength={NAME_MAX}
                      autoComplete="name"
                      placeholder="Optional"
                      className={FIELD}
                    />
                  </div>
                </div>
                <h2 className={HEADING}>Level frame</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Toggle on={xpAvatar} onChange={set(setXpAvatar)} label="Effects" />
                  <Toggle on={xpCard} onChange={set(setXpCard)} label="Border" />
                  {tiltable ? <Toggle on={motion} onChange={setMotionFrames} label="Tilt with the phone" /> : null}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4">
          <BackLink onClick={holdIfUnsaved} />
          <p
            aria-live="polite"
            className={cn("ml-auto text-sm font-bold", result?.ok ? "text-gold-200" : "text-red-300")}
          >
            {result?.message}
          </p>
          {editingPicture ? (
            <button
              type="button"
              onClick={() => {
                setCropping(null);
                setEditingPicture(false);
              }}
              className={BIG_BUTTON}
            >
              Back to settings
            </button>
          ) : (
            <button type="button" disabled={saving || !unsaved || !nameIsFree} onClick={save} className={BIG_BUTTON}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </footer>
      </StageRows>

      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent showCloseButton={false} className="theme-cosmos dark border-2 border-gold-400">
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>Your changes have not been saved and will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setLeaving(false)} className={GOLD_BUTTON}>
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className={cn(PILL_BUTTON, "bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500")}
            >
              Leave
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Stage>
  );
}
