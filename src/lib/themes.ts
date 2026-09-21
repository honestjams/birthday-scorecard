/**
 * One calm skeleton, a different personality per tab. Each key maps to a
 * `.theme-*` class in globals.css that recolours the accent beneath it.
 * The heroes lean on original homages — colour, type and motion — never
 * copyrighted logos or artwork.
 */
export type ThemeKey =
  | "default"
  | "bingo"
  | "karts"
  | "carspot"
  | "tournament"
  | "standings"
  | "profile";

export type ThemeDef = {
  key: ThemeKey;
  /** Short nav label. */
  label: string;
};

export const THEMES: Record<ThemeKey, ThemeDef> = {
  default: { key: "default", label: "Home" },
  bingo: { key: "bingo", label: "Bingo" },
  karts: { key: "karts", label: "Karts" },
  carspot: { key: "carspot", label: "Cars" },
  tournament: { key: "tournament", label: "Battle" },
  standings: { key: "standings", label: "Standings" },
  profile: { key: "profile", label: "Profile" },
};

/** Path prefix → theme. Order matters (first match wins). */
const ROUTES: { prefix: string; key: ThemeKey }[] = [
  { prefix: "/bingo", key: "bingo" },
  { prefix: "/karts", key: "karts" },
  { prefix: "/carspot", key: "carspot" },
  { prefix: "/draw", key: "tournament" },
  { prefix: "/standings", key: "standings" },
  { prefix: "/gallery", key: "default" },
  { prefix: "/u/", key: "profile" },
  { prefix: "/admin", key: "default" },
];

export function themeForPath(path: string): ThemeKey {
  for (const r of ROUTES) {
    if (path === r.prefix || path.startsWith(r.prefix)) return r.key;
  }
  return "default";
}

export function themeClass(key: ThemeKey): string {
  return `theme-${key}`;
}
