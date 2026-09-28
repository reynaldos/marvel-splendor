interface LibraryAvatar {
  id: string;
  label: string;
  src: string;
  /** Centres the subject in the circle, for a picture that isn't square. */
  fit?: string;
}

/** The pictures a player can pick from instead of uploading one. */
export const AVATAR_LIBRARY: LibraryAvatar[] = [
  { id: "thanos", label: "Thanos", src: "/assets/thanos.png", fit: "scale-115 object-[50%_15%]" },
  { id: "avengers", label: "Avengers", src: "/assets/avengers-icon.png", fit: "object-contain" },
  { id: "mind", label: "Mind Stone", src: "/assets/stones/mind-token.png" },
  { id: "space", label: "Space Stone", src: "/assets/stones/space-token.png" },
  { id: "soul", label: "Soul Stone", src: "/assets/stones/soul-token.png" },
  { id: "power", label: "Power Stone", src: "/assets/stones/power-token.png" },
  { id: "reality", label: "Reality Stone", src: "/assets/stones/reality-token.png" },
  { id: "time", label: "Time Stone", src: "/assets/stones/time-token.png" },
  { id: "shield", label: "S.H.I.E.L.D.", src: "/assets/stones/shield-token.png" },
];

// Uploaded pictures are stored under "avatars/", so the two can't be confused.
const PREFIX = "library/";

/** What is saved on the player for a library picture, or null if there is no such picture. */
export function libraryAvatarKey(id: string): string | null {
  return AVATAR_LIBRARY.some((a) => a.id === id) ? PREFIX + id : null;
}

/** The picture a saved key stands for, or null when the key isn't a library one. */
export function libraryAvatarSrc(key: string | null | undefined): string | null {
  if (!key?.startsWith(PREFIX)) return null;
  return AVATAR_LIBRARY.find((a) => PREFIX + a.id === key)?.src ?? null;
}
