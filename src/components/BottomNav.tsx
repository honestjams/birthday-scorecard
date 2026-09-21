"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useIsStaff } from "@/components/GuestProvider";

const TABS = [
  { href: "/bingo", label: "Bingo", glyph: GridGlyph },
  { href: "/karts", label: "Karts", glyph: FlagGlyph },
  { href: "/carspot", label: "Carspot", glyph: CarGlyph },
  { href: "/draw", label: "Draw", glyph: BracketGlyph },
  { href: "/standings", label: "Standings", glyph: TrophyGlyph },
  { href: "/gallery", label: "Archive", glyph: ArchiveGlyph },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isStaff = useIsStaff();

  const tabs = isStaff
    ? [...TABS, { href: "/admin", label: "Bureau", glyph: StampGlyph }]
    : TABS;

  return (
    <nav className="sticky bottom-0 z-30 border-t-4 border-ink bg-bone pb-safe">
      <ul className="flex">
        {tabs.map(({ href, label, glyph: Glyph }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-0.5 py-2 active:bg-bone-deep"
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-1 top-0 h-1 bg-stamp"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                ) : null}
                <Glyph active={active} />
                <span
                  className={`font-mono text-[8px] leading-none font-semibold whitespace-nowrap uppercase tracking-[0.04em] ${
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

/* ---- glyphs: drawn rather than imported, to keep the bundle honest ---- */

type G = { active: boolean };
const stroke = (a: boolean) => (a ? "var(--color-ink)" : "var(--color-ink-faint)");

function GridGlyph({ active }: G) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={1 + c * 6.3}
            y={1 + r * 6.3}
            width="5"
            height="5"
            fill={active && r === 1 && c === 1 ? "var(--color-stamp)" : "none"}
            stroke={stroke(active)}
            strokeWidth="1.5"
          />
        )),
      )}
    </svg>
  );
}

function FlagGlyph({ active }: G) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M4 2v16" stroke={stroke(active)} strokeWidth="1.8" />
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={5 + c * 4}
            y={3 + r * 4}
            width="4"
            height="4"
            fill={(r + c) % 2 === 0 ? stroke(active) : "none"}
          />
        )),
      )}
    </svg>
  );
}

function BracketGlyph({ active }: G) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none">
      <path
        d="M2 4h4v5h4M2 16h4v-5h4M10 10h3"
        stroke={stroke(active)}
        strokeWidth="1.7"
        strokeLinecap="square"
      />
      <circle
        cx="16"
        cy="10"
        r="2.5"
        fill={active ? "var(--color-stamp)" : "none"}
        stroke={stroke(active)}
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ArchiveGlyph({ active }: G) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none">
      <rect
        x="2"
        y="3"
        width="16"
        height="4"
        stroke={stroke(active)}
        strokeWidth="1.7"
      />
      <rect
        x="3.5"
        y="7"
        width="13"
        height="10"
        stroke={stroke(active)}
        strokeWidth="1.7"
      />
      <path d="M8 11h4" stroke={stroke(active)} strokeWidth="1.7" />
    </svg>
  );
}

function CarGlyph({ active }: G) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none">
      <path
        d="M2 12l1.5-4A2 2 0 0 1 5.4 6.7h9.2a2 2 0 0 1 1.9 1.3L18 12v3h-2M4 15H2v-3m0 0h16"
        stroke={stroke(active)}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle
        cx="6"
        cy="15"
        r="1.6"
        fill={active ? "var(--color-stamp)" : "none"}
        stroke={stroke(active)}
        strokeWidth="1.6"
      />
      <circle
        cx="14"
        cy="15"
        r="1.6"
        fill={active ? "var(--color-stamp)" : "none"}
        stroke={stroke(active)}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function TrophyGlyph({ active }: G) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none">
      <path
        d="M6 3h8v3a4 4 0 0 1-8 0z"
        fill={active ? "var(--color-stamp)" : "none"}
        stroke={stroke(active)}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6 4H3.5v1.5A2.5 2.5 0 0 0 6 8M14 4h2.5v1.5A2.5 2.5 0 0 1 14 8M10 10v3M7 17h6M8 17l.5-2h3l.5 2"
        stroke={stroke(active)}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StampGlyph({ active }: G) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none">
      <rect
        x="2.5"
        y="12"
        width="15"
        height="5"
        stroke={stroke(active)}
        strokeWidth="1.7"
      />
      <path
        d="M7 12V8.5A3 3 0 0 1 10 5.5a3 3 0 0 1 3 3V12"
        stroke={active ? "var(--color-stamp)" : stroke(active)}
        strokeWidth="1.7"
      />
    </svg>
  );
}
