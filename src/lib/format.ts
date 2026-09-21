/** Lap times are stored as integer milliseconds and shown as m:ss.mmm. */
export function formatLapTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  const s = seconds.toString().padStart(2, "0");
  const t = millis.toString().padStart(3, "0");
  return minutes > 0 ? `${minutes}:${s}.${t}` : `${seconds}.${t}`;
}

/** Gap to the leader, e.g. "+1.284". */
export function formatGap(ms: number, leaderMs: number): string {
  const delta = ms - leaderMs;
  if (delta <= 0) return "—";
  return `+${(delta / 1000).toFixed(3)}`;
}

/**
 * Accepts the ways a person actually types a lap time on a phone at a kart
 * track: "52.418", "1:02.418", "1.02.418", "62418" (raw ms), "1:02".
 * Returns milliseconds, or null if it cannot be read as a time.
 */
export function parseLapTime(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  // m:ss.mmm  /  m:ss  /  m:ss.mm
  const colon = raw.match(/^(\d{1,2})[:.](\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (colon && raw.includes(":")) {
    const [, m, s, frac] = colon;
    const seconds = Number(s);
    if (seconds > 59) return null;
    return (
      Number(m) * 60000 + seconds * 1000 + padFraction(frac)
    );
  }

  // ss.mmm
  const plain = raw.match(/^(\d{1,3})(?:[.,](\d{1,3}))?$/);
  if (plain) {
    const [, s, frac] = plain;
    return Number(s) * 1000 + padFraction(frac);
  }

  return null;
}

function padFraction(frac?: string): number {
  if (!frac) return 0;
  return Number(frac.padEnd(3, "0").slice(0, 3));
}

export const LAP_MIN_MS = 5_000;
export const LAP_MAX_MS = 1_800_000;

export function lapTimeError(ms: number): string | null {
  if (ms < LAP_MIN_MS) return "Nobody has ever done a lap that quickly.";
  if (ms > LAP_MAX_MS) return "That is not a lap, that is an afternoon.";
  return null;
}

/** "1st", "2nd", "3rd"… because a leaderboard without ordinals is a list. */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
