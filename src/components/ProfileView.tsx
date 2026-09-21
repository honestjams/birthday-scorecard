"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import type { PointAward, Role } from "@/types/database";

type CarspotUpload = {
  id: string;
  url: string;
  caption: string | null;
  voided: boolean;
};
type BingoUpload = { id: string; url: string; title: string };

type ProfileGuest = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
};

const AVATAR_COMPRESSION = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 512,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
  initialQuality: 0.82,
};

export function ProfileView({
  guest,
  isMe,
  totalPoints,
  awards,
  wins,
  losses,
  carspotUploads,
  bingoUploads,
}: {
  guest: ProfileGuest;
  isMe: boolean;
  totalPoints: number;
  awards: PointAward[];
  wins: number;
  losses: number;
  carspotUploads: CarspotUpload[];
  bingoUploads: BingoUpload[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(guest.avatar_url);
  const [name, setName] = useState(guest.display_name);
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState<null | "avatar" | "name">(null);
  const [error, setError] = useState<string | null>(null);

  const played = wins + losses;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : null;

  async function onPickAvatar(file: File) {
    setError(null);
    setBusy("avatar");
    try {
      let toUpload: File | Blob = file;
      try {
        toUpload = await imageCompression(file, AVATAR_COMPRESSION);
      } catch {
        // Fall back to the original for formats the browser cannot redraw.
      }
      const path = `${guest.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, toUpload, {
          contentType: (toUpload as File).type || "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: dbErr } = await supabase
        .from("guests")
        .update({ avatar_url: publicUrl })
        .eq("id", guest.id);
      if (dbErr) throw dbErr;

      setAvatarUrl(publicUrl);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? `Photo failed: ${err.message}` : "Photo failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("A name is required.");
      return;
    }
    setError(null);
    setBusy("name");
    const { error: dbErr } = await supabase
      .from("guests")
      .update({ display_name: trimmed })
      .eq("id", guest.id);
    setBusy(null);
    if (dbErr) {
      setError("Could not save that name.");
      return;
    }
    setEditingName(false);
    router.refresh();
  }

  return (
    <div className="px-4 py-5 pb-10">
      {/* ---- identity card ---- */}
      <section className="doc p-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar name={name} url={avatarUrl} size={72} />
            {isMe ? (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy === "avatar"}
                aria-label="Change photo"
                className="absolute -right-2 -bottom-2 flex h-7 w-7 items-center justify-center border-2 border-ink bg-hazard font-mono text-[9px] font-bold uppercase disabled:opacity-50"
              >
                {busy === "avatar" ? "…" : <CameraGlyph />}
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onPickAvatar(f);
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="space-y-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  aria-label="Display name"
                  className="w-full border-2 border-ink bg-white px-2 py-1.5 text-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveName}
                    disabled={busy === "name"}
                    className="border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-bone disabled:opacity-50"
                  >
                    {busy === "name" ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setName(guest.display_name);
                      setEditingName(false);
                    }}
                    className="border-2 border-ink/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-2xl leading-tight uppercase">
                  {name}
                </h2>
                {isMe ? (
                  <button
                    onClick={() => setEditingName(true)}
                    className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-stamp underline underline-offset-2"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            )}

            <span
              className={`mt-2 inline-block border-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${
                guest.role === "host"
                  ? "border-stamp text-stamp"
                  : guest.role === "helper"
                    ? "border-seal text-seal"
                    : "border-ink/25 text-ink-faint"
              }`}
            >
              {guest.role}
            </span>
          </div>
        </div>

        {error ? (
          <p className="mt-3 border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep">
            {error}
          </p>
        ) : null}
      </section>

      {/* ---- the numbers ---- */}
      <section className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Points" value={totalPoints} accent />
        <Stat label="Wins" value={wins} />
        <Stat label="Losses" value={losses} />
      </section>
      {winRate !== null ? (
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          {winRate}% win rate across {played} judged duel
          {played === 1 ? "" : "s"}
        </p>
      ) : null}

      {/* ---- points breakdown ---- */}
      <section className="mt-6">
        <SectionHeading>Points</SectionHeading>
        {awards.length === 0 ? (
          <p className="doc-soft px-4 py-6 text-center text-sm text-ink-faint">
            No points recorded yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {awards.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 border-2 border-ink bg-card px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">
                  {a.label}
                  {a.source === "manual" ? (
                    <span className="ml-1.5 font-mono text-[9px] uppercase tracking-widest text-seal">
                      bonus
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-display text-base tabular-nums">
                  +{a.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- carspot uploads ---- */}
      <section className="mt-6">
        <SectionHeading>Cars spotted · {carspotUploads.length}</SectionHeading>
        {carspotUploads.length === 0 ? (
          <p className="doc-soft px-4 py-6 text-center text-sm text-ink-faint">
            No cars spotted yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {carspotUploads.map((u) => (
              <figure
                key={u.id}
                className="relative aspect-square overflow-hidden border-2 border-ink bg-ink"
              >
                {u.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.url}
                    alt={u.caption ?? "Spotted car"}
                    loading="lazy"
                    className={`h-full w-full object-cover ${
                      u.voided ? "opacity-30 grayscale" : ""
                    }`}
                  />
                ) : null}
                {u.voided ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="stamp bg-bone/90 text-[10px]">Void</span>
                  </span>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* ---- bingo uploads ---- */}
      <section className="mt-6">
        <SectionHeading>Bingo photos · {bingoUploads.length}</SectionHeading>
        {bingoUploads.length === 0 ? (
          <p className="doc-soft px-4 py-6 text-center text-sm text-ink-faint">
            No bingo photos yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {bingoUploads.map((u) => (
              <figure
                key={u.id}
                className="relative aspect-square overflow-hidden border-2 border-ink bg-ink"
              >
                {u.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.url}
                    alt={u.title}
                    loading="lazy"
                    className="h-full w-full object-cover opacity-90"
                  />
                ) : null}
                <figcaption className="absolute inset-x-0 bottom-0 truncate bg-ink/80 px-1 py-0.5 font-mono text-[7px] uppercase tracking-wide text-bone">
                  {u.title}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {isMe ? (
        <button
          onClick={signOut}
          className="mt-8 w-full rounded-xl border border-line py-3 text-center text-sm font-medium text-ink-soft active:bg-surface-2"
        >
          Sign out
        </button>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`border-2 border-ink px-2 py-3 text-center ${
        accent ? "bg-hazard" : "bg-card"
      }`}
    >
      <p className="font-display text-2xl leading-none tabular-nums">{value}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-ink-soft">
      {children}
    </h3>
  );
}

function CameraGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden fill="none">
      <path
        d="M3 6h3l1.5-2h5L14 6h3v10H3z"
        stroke="var(--color-ink)"
        strokeWidth="1.8"
      />
      <circle
        cx="10"
        cy="11"
        r="3"
        stroke="var(--color-ink)"
        strokeWidth="1.8"
      />
    </svg>
  );
}
