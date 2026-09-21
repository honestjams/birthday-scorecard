import type { CSSProperties, ReactNode } from "react";
import type { ThemeKey } from "@/lib/themes";

type HeroStyle = {
  band: CSSProperties;
  fg: string;
  titleClass: string;
  kickerClass: string;
  motif?: ReactNode;
};

const HERO: Record<ThemeKey, HeroStyle> = {
  default: {
    band: { background: "linear-gradient(120deg,#4f46e5,#818cf8)" },
    fg: "#fff",
    titleClass: "font-display text-3xl uppercase tracking-tight",
    kickerClass: "text-white/70",
  },
  bingo: {
    band: { background: "linear-gradient(120deg,#0f766e,#0ea5a4)" },
    fg: "#fff",
    titleClass: "font-display text-3xl uppercase tracking-tight",
    kickerClass: "text-white/75",
  },
  // Fast & Furious — asphalt at night, nitrous streaks.
  karts: {
    band: { background: "linear-gradient(115deg,#141417 0%,#26262b 60%,#3a1c12 100%)" },
    fg: "#fff",
    titleClass: "font-display text-4xl uppercase tracking-tight italic -skew-x-6",
    kickerClass: "text-[#ffb400]",
    motif: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "repeating-linear-gradient(115deg, transparent 0 22px, rgba(245,57,29,.5) 22px 24px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2"
          style={{
            background:
              "repeating-linear-gradient(90deg,#111 0 10px,#f5f5f5 10px 20px)",
          }}
        />
      </>
    ),
  },
  // Drive — midnight, hot-pink neon script.
  carspot: {
    band: {
      background:
        "radial-gradient(120% 140% at 80% -10%, #2a1030 0%, #0b0a14 55%)",
    },
    fg: "#ffd9ec",
    titleClass: "font-script text-5xl leading-[0.9]",
    kickerClass: "font-mono uppercase tracking-[0.35em] text-[#7c5cff]",
    motif: (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,#ff2d87,transparent)" }}
      />
    ),
  },
  // Tekken / PS1 arcade — CRT scanlines, pixel type.
  tournament: {
    band: { background: "linear-gradient(180deg,#0b1020,#131a33)" },
    fg: "#e8f0ff",
    titleClass: "font-arcade text-xl leading-tight uppercase",
    kickerClass: "font-arcade text-[9px] uppercase text-[#ff415d]",
    motif: (
      <div aria-hidden className="scanlines pointer-events-none absolute inset-0 opacity-60" />
    ),
  },
  // Standings — trophy gold.
  standings: {
    band: { background: "linear-gradient(120deg,#7a5a10,#e29500)" },
    fg: "#fff",
    titleClass: "font-display text-3xl uppercase tracking-tight",
    kickerClass: "text-white/80",
  },
  profile: {
    band: { background: "linear-gradient(120deg,#5b4bd6,#a78bfa)" },
    fg: "#fff",
    titleClass: "font-display text-3xl uppercase tracking-tight",
    kickerClass: "text-white/75",
  },
};

/**
 * The themed page header. `kicker` is the one-line "what am I doing here"
 * prompt; `title` is the page name in the tab's own type treatment.
 */
export function PageHero({
  theme,
  title,
  kicker,
  children,
}: {
  theme: ThemeKey;
  title: string;
  kicker?: string;
  children?: ReactNode;
}) {
  const h = HERO[theme];
  return (
    <section
      className="relative overflow-hidden px-5 pt-6 pb-5"
      style={{ ...h.band, color: h.fg }}
    >
      {h.motif}
      <div className="relative">
        {kicker ? (
          <p className={`mb-1.5 text-[11px] font-semibold ${h.kickerClass}`}>
            {kicker}
          </p>
        ) : null}
        <h1 className={h.titleClass}>{title}</h1>
        {children ? <div className="relative mt-3">{children}</div> : null}
      </div>
    </section>
  );
}
