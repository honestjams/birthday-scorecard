"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { href: "/bingo", label: "Bingo", glyph: GridGlyph },
  { href: "/karts", label: "Karts", glyph: FlagGlyph },
  { href: "/carspot", label: "Cars", glyph: CarGlyph },
  { href: "/draw", label: "Battle", glyph: VersusGlyph },
  { href: "/standings", label: "Ranks", glyph: TrophyGlyph },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 border-t border-line bg-card/90 backdrop-blur pb-safe">
      <ul className="flex">
        {TABS.map(({ href, label, glyph: Glyph }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[60px] touch-manipulation flex-col items-center justify-center gap-1 py-2 active:scale-95 transition-transform"
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 top-0 h-[3px] rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 520, damping: 36 }}
                  />
                ) : null}
                <span className={active ? "text-accent" : "text-ink-faint"}>
                  <Glyph />
                </span>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    active ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---- glyphs (currentColor, so they inherit the active accent) ---- */

function GridGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12.5" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="12.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12.5" y="12.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function FlagGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M5 3v16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M6 4h11v8H6z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 4h3.6v2.6H6zM13 4h4v2.6h-4zM9.6 6.6H13v2.6H9.6zM6 9.2h3.6v2.6H6zM13 9.2h4v2.6h-4z" fill="currentColor" />
    </svg>
  );
}

function CarGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M3 13l1.6-4.3A2.2 2.2 0 0 1 6.7 7.3h8.6a2.2 2.2 0 0 1 2.1 1.4L19 13v3.4h-2.2M5.2 16.4H3V13m0 0h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="6.6" cy="16.4" r="1.7" fill="currentColor" />
      <circle cx="15.4" cy="16.4" r="1.7" fill="currentColor" />
    </svg>
  );
}

function VersusGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M3 4l3.2 8L9 4M4 12h4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 4h4.2M13 4c0 2.4 4 1.6 4 4s-4 1.6-4 4h4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 2.5l1.4 3-1.4 3-1.4-3z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function TrophyGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M7 3.5h8v3.5a4 4 0 0 1-8 0z" fill="currentColor" opacity="0.9" />
      <path
        d="M7 4.5H4.2v1.6A2.6 2.6 0 0 0 7 8.6M15 4.5h2.8v1.6A2.6 2.6 0 0 1 15 8.6M11 11v3M8 18h6M8.8 18l.5-2.4h3.4l.5 2.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
