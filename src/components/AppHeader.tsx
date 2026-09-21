"use client";

import Link from "next/link";
import { useGuest, useIsStaff } from "@/components/GuestProvider";
import { Avatar } from "@/components/Avatar";

/** Slim top bar: who's signed in, the party wordmark, and quick links. */
export function AppHeader({ partyName }: { partyName: string }) {
  const guest = useGuest();
  const isStaff = useIsStaff();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-card/85 px-4 py-2.5 backdrop-blur pt-safe">
      <Link href="/standings" className="min-w-0">
        <p className="truncate font-display text-[15px] leading-none tracking-tight">
          {partyName}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <IconLink href="/gallery" label="Photo archive">
          <ArchiveGlyph />
        </IconLink>
        {isStaff ? (
          <IconLink href="/admin" label="Host controls">
            <GearGlyph />
          </IconLink>
        ) : null}
        <Link
          href={`/u/${guest.id}`}
          aria-label="Your profile"
          className="ml-0.5 rounded-full ring-2 ring-transparent transition active:ring-accent"
        >
          <Avatar
            name={guest.display_name}
            url={guest.avatar_url}
            size={32}
            className="rounded-full"
          />
        </Link>
      </div>
    </header>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition active:bg-surface-2"
    >
      {children}
    </Link>
  );
}

function ArchiveGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="4" width="15" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="7.5" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GearGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
