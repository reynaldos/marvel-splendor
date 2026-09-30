interface LibraryAvatar {
  id: string;
  label: string;
  src: string;
  /** Centres the subject in the circle, for a picture that isn't square. */
  fit?: string;
}

/**
 * The pictures a player can pick from instead of uploading one. To add one,
 * put a square picture in public/assets/pfp and give it a line here. A
 * player's choice is saved by `id`, so never change or reuse one.
 */
export const AVATAR_LIBRARY: LibraryAvatar[] = [
  { id: "iron-man", label: "Iron Man", src: "/assets/pfp/pfp-iron-man.jpg" },
  { id: "captain-america", label: "Captain America", src: "/assets/pfp/pfp-captain-america.jpg" },
  { id: "thor", label: "Thor", src: "/assets/pfp/pfp-thor.jpg" },
  { id: "hulk", label: "Hulk", src: "/assets/pfp/pfp-hulk.jpg" },
  { id: "black-widow", label: "Black Widow", src: "/assets/pfp/pfp-black-widow.jpg" },
  { id: "spider-man", label: "Spider-Man", src: "/assets/pfp/pfp-spider-man.jpg" },
  { id: "dr-strange", label: "Doctor Strange", src: "/assets/pfp/pfp-dr-strange.jpg" },
  { id: "scarlet-witch", label: "Scarlet Witch", src: "/assets/pfp/pfp-scarlet-witch.jpg" },
  { id: "vision", label: "Vision", src: "/assets/pfp/pfp-vision.jpg" },
  { id: "ant-man", label: "Ant-Man", src: "/assets/pfp/pfp-ant-man.jpg" },
  { id: "wolverine", label: "Wolverine", src: "/assets/pfp/pfp-wolverine.jpg" },
  { id: "storm", label: "Storm", src: "/assets/pfp/pfp-storm.jpg" },
  { id: "mr-fantastic", label: "Mister Fantastic", src: "/assets/pfp/pfp-mr-fantastic.jpg" },
  { id: "invisible-woman", label: "Invisible Woman", src: "/assets/pfp/pfp-invisible-woman.jpg" },
  { id: "loki", label: "Loki", src: "/assets/pfp/pfp-loki.jpg" },
  { id: "venom", label: "Venom", src: "/assets/pfp/pfp-venom.jpg" },
  { id: "magneto", label: "Magneto", src: "/assets/pfp/pfp-magneto.jpg" },
  { id: "doom", label: "Doctor Doom", src: "/assets/pfp/pfp-doom.jpg" },
];

// Uploaded pictures are stored under "avatars/", so the two can't be confused.
const PREFIX = "library/";

/** What is saved on the player for a library picture, or null if there is no such picture. */
export function libraryAvatarKey(id: string): string | null {
  return AVATAR_LIBRARY.some((a) => a.id === id) ? PREFIX + id : null;
}

/** A library picture picked at random, for a new player to start with. */
export function randomLibraryAvatarKey(): string {
  return PREFIX + AVATAR_LIBRARY[Math.floor(Math.random() * AVATAR_LIBRARY.length)].id;
}

/** The picture a saved key stands for, or null when the key isn't a library one. */
export function libraryAvatarSrc(key: string | null | undefined): string | null {
  if (!key?.startsWith(PREFIX)) return null;
  return AVATAR_LIBRARY.find((a) => PREFIX + a.id === key)?.src ?? null;
}
