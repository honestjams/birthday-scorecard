"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import type { BingoEntry, BingoSquare } from "@/types/database";

type Props = {
  squares: BingoSquare[];
  entries: BingoEntry[];
  signedUrls: Record<string, string>;
  guestId: string;
  open: boolean;
};

type EntryState = {
  entry: BingoEntry;
  url: string;
};

/**
 * Compression settings. 1920px on the long edge is well above what a 1080p
 * recap reel needs, and keeps ~750 party photos inside the free storage tier.
 */
const COMPRESSION = {
  maxSizeMB: 0.9,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
  initialQuality: 0.82,
};

export function BingoGrid({
  squares,
  entries,
  signedUrls,
  guestId,
  open,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [state, setState] = useState<Record<string, EntryState>>(() => {
    const initial: Record<string, EntryState> = {};
    for (const e of entries) {
      const url = signedUrls[e.storage_path];
      if (url) initial[e.square_id] = { entry: e, url };
    }
    return initial;
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [justStamped, setJustStamped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = squares.find((s) => s.id === activeId) ?? null;
  const lines = useMemo(
    () => completedLines(squares, state),
    [squares, state],
  );

  async function upload(square: BingoSquare, file: File) {
    setError(null);
    setUploading(square.id);

    try {
      let toUpload: File | Blob = file;
      try {
        toUpload = await imageCompression(file, COMPRESSION);
      } catch {
        // HEIC or an exotic format the browser cannot draw to canvas.
        // Uploading the original is better than losing the moment.
      }

      const ext = (toUpload as File).type === "image/png" ? "png" : "jpg";
      const path = `${guestId}/${square.id}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("bingo-photos")
        .upload(path, toUpload, {
          contentType: (toUpload as File).type || "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;

      const previous = state[square.id]?.entry;

      const { data: saved, error: dbErr } = await supabase
        .from("bingo_entries")
        .upsert(
          {
            guest_id: guestId,
            square_id: square.id,
            storage_path: path,
            bytes: (toUpload as File).size ?? null,
          },
          { onConflict: "guest_id,square_id" },
        )
        .select()
        .single();
      if (dbErr) throw dbErr;

      const { data: signed } = await supabase.storage
        .from("bingo-photos")
        .createSignedUrl(path, 60 * 60);

      setState((s) => ({
        ...s,
        [square.id]: { entry: saved as BingoEntry, url: signed?.signedUrl ?? "" },
      }));

      // Tidy up the replaced photo so storage does not fill with drafts.
      if (previous && previous.storage_path !== path) {
        void supabase.storage.from("bingo-photos").remove([previous.storage_path]);
      }

      setJustStamped(square.id);
      setTimeout(() => setJustStamped(null), 1400);
      setActiveId(null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Upload failed. Check your signal and try again.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function remove(square: BingoSquare) {
    const current = state[square.id];
    if (!current) return;
    setUploading(square.id);
    try {
      await supabase.from("bingo_entries").delete().eq("id", current.entry.id);
      await supabase.storage
        .from("bingo-photos")
        .remove([current.entry.storage_path]);
      setState((s) => {
        const next = { ...s };
        delete next[square.id];
        return next;
      });
      setActiveId(null);
    } finally {
      setUploading(null);
    }
  }

  const filedCount = Object.keys(state).length;

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-ink px-5 py-2.5 text-bone">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          Submissions on file
        </span>
        <span className="font-display text-sm tracking-widest tabular-nums">
          {String(filedCount).padStart(2, "0")} / {squares.length}
        </span>
      </div>

      {error ? (
        <p
          role="alert"
          className="animate-shake mx-4 mt-4 border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep"
        >
          {error}
        </p>
      ) : null}

      {lines.length > 0 ? (
        <div className="mx-4 mt-4 flex items-center gap-2 border-2 border-approved bg-approved/10 px-3 py-2">
          <span className="font-display text-xs uppercase tracking-widest text-approved">
            {lines.length} line{lines.length > 1 ? "s" : ""} certified
          </span>
          <span className="text-[12px] text-ink-soft">
            Notify the adjudicator loudly.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-5 gap-1.5 p-4 pb-8">
        {squares.map((square, index) => {
          const filled = state[square.id];
          const inLine = lines.some((l) => l.includes(index));
          return (
            <motion.button
              key={square.id}
              type="button"
              onClick={() => setActiveId(square.id)}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              aria-label={`${square.title}${filled ? " — filed" : " — not yet filed"}`}
              className={`relative aspect-square overflow-hidden border-2 ${
                inLine ? "border-approved" : "border-ink"
              } ${filled ? "bg-ink" : "bg-card"} touch-manipulation`}
            >
              {filled?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={filled.url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-85"
                  loading="lazy"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center px-[3px] pt-2 pb-1 text-center font-mono text-[7px] leading-[1.25] font-semibold uppercase tracking-[-0.01em] text-ink-soft hyphens-auto">
                  {square.title}
                </span>
              )}

              <span className="absolute top-0 left-0 bg-ink px-1 font-mono text-[8px] font-bold text-bone">
                {square.position}
              </span>

              {filled ? (
                <span
                  className={`absolute right-0.5 bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-stamp bg-bone ${
                    justStamped === square.id ? "animate-stamp-in" : ""
                  }`}
                >
                  <TickGlyph />
                </span>
              ) : null}

              {uploading === square.id ? (
                <span className="absolute inset-0 flex items-center justify-center bg-bone/85 font-mono text-[8px] uppercase">
                  …
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {active ? (
          <SquareSheet
            square={active}
            filled={state[active.id]}
            busy={uploading === active.id}
            open={open}
            onClose={() => setActiveId(null)}
            onPick={(file) => upload(active, file)}
            onRemove={() => remove(active)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */

function SquareSheet({
  square,
  filled,
  busy,
  open,
  onClose,
  onPick,
  onRemove,
}: {
  square: BingoSquare;
  filled?: EntryState;
  busy: boolean;
  open: boolean;
  onClose: () => void;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/55"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative w-full max-w-[520px] border-t-4 border-ink bg-bone pb-safe"
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Item {String(square.position).padStart(2, "0")} of 25
            </p>
            <h2 className="mt-1 font-display text-xl leading-tight uppercase">
              {square.title}
            </h2>
          </div>
          {filled ? (
            <span className="stamp mt-1 shrink-0 text-[10px]">Filed</span>
          ) : null}
        </div>

        <div className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            {square.description}
          </p>

          {filled?.url ? (
            <div className="mt-4 border-2 border-ink bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filled.url}
                alt={`Your submission for ${square.title}`}
                className="max-h-[42vh] w-full object-contain"
              />
            </div>
          ) : null}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onPick(f);
            }}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onPick(f);
            }}
          />

          {open ? (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <SheetButton
                busy={busy}
                primary
                onClick={() => cameraRef.current?.click()}
              >
                {busy ? "Filing…" : "Take photo"}
              </SheetButton>
              <SheetButton busy={busy} onClick={() => libraryRef.current?.click()}>
                From library
              </SheetButton>
            </div>
          ) : (
            <p className="mt-5 border-2 border-ink bg-hazard px-3 py-2 text-center font-mono text-[11px] uppercase tracking-widest">
              Submissions are closed
            </p>
          )}

          {filled && open ? (
            <button
              onClick={onRemove}
              disabled={busy}
              className="mt-3 w-full py-2 text-center font-mono text-[11px] uppercase tracking-widest text-stamp underline underline-offset-4 disabled:opacity-50"
            >
              Withdraw this submission
            </button>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SheetButton({
  children,
  onClick,
  busy,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={busy}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className={`min-h-[52px] border-2 border-ink px-3 py-3 font-display text-[13px] uppercase tracking-widest disabled:opacity-60 ${
        primary
          ? "bg-ink text-bone shadow-[3px_3px_0_0_var(--color-stamp)]"
          : "bg-card text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
      }`}
    >
      {children}
    </motion.button>
  );
}

function TickGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M2 6.5 4.8 9.2 10 3.4"
        fill="none"
        stroke="var(--color-stamp)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- helpers ---- */

/** Rows, columns and both diagonals of a 5×5 card. */
function completedLines(
  squares: BingoSquare[],
  state: Record<string, EntryState>,
): number[][] {
  if (squares.length < 25) return [];
  const filled = squares.map((s) => Boolean(state[s.id]));

  const lines: number[][] = [];
  for (let r = 0; r < 5; r++) lines.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);

  return lines.filter((line) => line.every((i) => filled[i]));
}
