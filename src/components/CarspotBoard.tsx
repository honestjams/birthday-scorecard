"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import type { CarspotMatch, CarspotStatus } from "@/types/database";

export type CarspotEntryRow = {
  id: string;
  guest_id: string;
  storage_path: string;
  caption: string | null;
  location: string | null;
  voided: boolean;
  void_reason: string | null;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
};

const COMPRESSION = {
  maxSizeMB: 0.9,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
  initialQuality: 0.82,
};

type Props = {
  initialEntries: CarspotEntryRow[];
  initialUrls: Record<string, string>;
  initialMatches: CarspotMatch[];
  guestId: string;
  isStaff: boolean;
  open: boolean;
  status: CarspotStatus;
  rounds: number;
};

export function CarspotBoard({
  initialEntries,
  initialUrls,
  initialMatches,
  guestId,
  isStaff,
  open,
  status,
  rounds,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState(initialEntries);
  const [urls, setUrls] = useState(initialUrls);
  const [matches, setMatches] = useState(initialMatches);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [{ data: e }, { data: m }] = await Promise.all([
      supabase
        .from("carspot_entries")
        .select("*, guests(display_name, avatar_url)")
        .order("created_at", { ascending: false }),
      supabase.from("carspot_matches").select("*").order("round").order("slot"),
    ]);

    if (e) {
      const rows: CarspotEntryRow[] = e.map((row) => {
        const g = row.guests as unknown as {
          display_name: string;
          avatar_url: string | null;
        } | null;
        return {
          id: row.id,
          guest_id: row.guest_id,
          storage_path: row.storage_path,
          caption: row.caption,
          location: row.location,
          voided: row.voided,
          void_reason: row.void_reason,
          created_at: row.created_at,
          display_name: g?.display_name ?? "Unknown",
          avatar_url: g?.avatar_url ?? null,
        };
      });
      setEntries(rows);

      const paths = rows.map((r) => r.storage_path);
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from("carspot-photos")
          .createSignedUrls(paths, 60 * 60);
        const next: Record<string, string> = {};
        signed?.forEach((s) => {
          if (s.signedUrl && s.path) next[s.path] = s.signedUrl;
        });
        setUrls(next);
      }
    }
    if (m) setMatches(m as CarspotMatch[]);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("carspot")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carspot_entries" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carspot_matches" },
        () => void refresh(),
      )
      .subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  const urlFor = useCallback((path: string) => urls[path] ?? "", [urls]);
  const entryById = useMemo(() => {
    const map = new Map<string, CarspotEntryRow>();
    for (const e of entries) map.set(e.id, e);
    return map;
  }, [entries]);

  const mine = entries.filter((e) => e.guest_id === guestId);
  const liveCount = entries.filter((e) => !e.voided).length;

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      let toUpload: File | Blob = file;
      try {
        toUpload = await imageCompression(file, COMPRESSION);
      } catch {
        // Upload the original for exotic formats.
      }
      const path = `${guestId}/car-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("carspot-photos")
        .upload(path, toUpload, {
          contentType: (toUpload as File).type || "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("carspot_entries").insert({
        guest_id: guestId,
        storage_path: path,
        caption: caption.trim() || null,
        location: location.trim() || null,
      });
      if (dbErr) throw dbErr;

      setCaption("");
      setLocation("");
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Upload failed. Check your signal and try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function withdraw(entry: CarspotEntryRow) {
    if (!confirm("Withdraw this carspot?")) return;
    setBusy(entry.id);
    await supabase.from("carspot_entries").delete().eq("id", entry.id);
    await supabase.storage.from("carspot-photos").remove([entry.storage_path]);
    await refresh();
    setBusy(null);
  }

  async function toggleVoid(entry: CarspotEntryRow) {
    setBusy(entry.id);
    setError(null);
    let reason: string | null = null;
    if (!entry.voided) {
      reason = prompt("Reason (e.g. duplicate of a car already filed):") ?? "";
    }
    const { error: err } = await supabase
      .from("carspot_entries")
      .update({ voided: !entry.voided, void_reason: entry.voided ? null : reason })
      .eq("id", entry.id);
    if (err) setError(err.message);
    await refresh();
    setBusy(null);
  }

  async function conductDraw() {
    if (!confirm("Convene the judging bracket from all un-voided entries?"))
      return;
    setBusy("draw");
    setError(null);
    const { error: err } = await supabase.rpc("generate_carspot_draw");
    if (err) setError(err.message);
    await refresh();
    setBusy(null);
  }

  async function pickWinner(match: CarspotMatch, winner: string) {
    if (!isStaff || busy) return;
    setBusy(match.id);
    setError(null);
    const { error: err } = await supabase.rpc("advance_carspot_match", {
      p_match_id: match.id,
      p_winner: winner,
    });
    if (err) setError(err.message);
    await refresh();
    setBusy(null);
  }

  return (
    <>
      {/* ---- submission ---- */}
      <section className="border-b-4 border-ink bg-card px-5 py-5">
        {open ? (
          <>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={60}
              placeholder="What is it? (e.g. '1974 Citroën SM')"
              aria-label="Car caption"
              className="w-full border-2 border-ink bg-white px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-hazard"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={48}
              placeholder="Where did you spot it? (optional)"
              aria-label="Location"
              className="mt-2 w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-hazard"
            />

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) upload(f);
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
                if (f) upload(f);
              }}
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                disabled={uploading}
                whileTap={{ scale: 0.97 }}
                onClick={() => cameraRef.current?.click()}
                className="min-h-[52px] border-2 border-ink bg-ink px-3 py-3 font-display text-[13px] uppercase tracking-widest text-bone shadow-[3px_3px_0_0_var(--color-stamp)] disabled:opacity-60"
              >
                {uploading ? "Filing…" : "Take photo"}
              </motion.button>
              <motion.button
                type="button"
                disabled={uploading}
                whileTap={{ scale: 0.97 }}
                onClick={() => libraryRef.current?.click()}
                className="min-h-[52px] border-2 border-ink bg-card px-3 py-3 font-display text-[13px] uppercase tracking-widest shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-60"
              >
                From library
              </motion.button>
            </div>
          </>
        ) : (
          <p className="border-2 border-ink bg-hazard px-3 py-3 text-center font-mono text-[11px] uppercase tracking-widest">
            Carspotting submissions are closed
          </p>
        )}

        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          {mine.length} filed by you · {liveCount} in contention
        </p>
      </section>

      {error ? (
        <p className="animate-shake mx-4 mt-4 border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep">
          {error}
        </p>
      ) : null}

      {/* ---- judging ---- */}
      <Judging
        status={status}
        rounds={rounds}
        matches={matches}
        entryById={entryById}
        urlFor={urlFor}
        guestId={guestId}
        isStaff={isStaff}
        liveCount={liveCount}
        busy={busy}
        onPick={pickWinner}
        onDraw={conductDraw}
      />

      {/* ---- the feed ---- */}
      <section className="px-4 py-5 pb-10">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="font-display text-lg uppercase tracking-tight">
            Cars on file
          </h2>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stamp" />
            Live
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="doc-soft px-4 py-8 text-center text-sm text-ink-faint">
            No cars spotted yet. Be the first to file.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className={`border-2 ${
                    e.voided ? "border-ink/30" : "border-ink"
                  } bg-card`}
                >
                  <div className="relative aspect-square overflow-hidden bg-ink">
                    {urlFor(e.storage_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlFor(e.storage_path)}
                        alt={e.caption ?? "Spotted car"}
                        loading="lazy"
                        className={`h-full w-full object-cover ${
                          e.voided ? "opacity-30 grayscale" : ""
                        }`}
                      />
                    ) : null}
                    {e.voided ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="stamp bg-bone/90">Void</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="p-2">
                    {e.caption ? (
                      <p className="truncate text-[13px] font-medium">
                        {e.caption}
                      </p>
                    ) : (
                      <p className="text-[13px] text-ink-faint italic">
                        Unidentified vehicle
                      </p>
                    )}
                    {e.location ? (
                      <p className="truncate font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                        {e.location}
                      </p>
                    ) : null}

                    <Link
                      href={`/u/${e.guest_id}`}
                      className="mt-1.5 flex items-center gap-1.5 active:opacity-70"
                    >
                      <Avatar
                        name={e.display_name}
                        url={e.avatar_url}
                        size={18}
                      />
                      <span className="truncate text-[11px] text-ink-soft underline underline-offset-2">
                        {e.display_name}
                        {e.guest_id === guestId ? " (you)" : ""}
                      </span>
                    </Link>

                    {e.voided && e.void_reason ? (
                      <p className="mt-1 truncate font-mono text-[9px] text-stamp">
                        {e.void_reason}
                      </p>
                    ) : null}

                    {isStaff ? (
                      <button
                        onClick={() => toggleVoid(e)}
                        disabled={busy === e.id}
                        className="mt-2 w-full border-2 border-ink/40 py-1 font-mono text-[9px] uppercase tracking-widest disabled:opacity-50"
                      >
                        {e.voided ? "Restore" : "Void car"}
                      </button>
                    ) : e.guest_id === guestId && open ? (
                      <button
                        onClick={() => withdraw(e)}
                        disabled={busy === e.id}
                        className="mt-2 w-full py-1 font-mono text-[9px] uppercase tracking-widest text-stamp underline underline-offset-2 disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    ) : null}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Judging({
  status,
  rounds,
  matches,
  entryById,
  urlFor,
  guestId,
  isStaff,
  liveCount,
  busy,
  onPick,
  onDraw,
}: {
  status: CarspotStatus;
  rounds: number;
  matches: CarspotMatch[];
  entryById: Map<string, CarspotEntryRow>;
  urlFor: (path: string) => string;
  guestId: string;
  isStaff: boolean;
  liveCount: number;
  busy: string | null;
  onPick: (match: CarspotMatch, winner: string) => void;
  onDraw: () => void;
}) {
  const normal = matches.filter((m) => !m.is_bronze);
  const bronze = matches.find((m) => m.is_bronze) ?? null;

  const byRound = useMemo(() => {
    const map = new Map<number, CarspotMatch[]>();
    for (const m of normal) {
      const list = map.get(m.round) ?? [];
      list.push(m);
      map.set(m.round, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const final = normal.find((m) => m.round === rounds && m.slot === 1) ?? null;
  const champion = final?.winner_entry ? entryById.get(final.winner_entry) : null;
  const runnerUp =
    final && final.status === "complete" && final.winner_entry
      ? entryById.get(
          final.winner_entry === final.entry_a
            ? (final.entry_b ?? "")
            : (final.entry_a ?? ""),
        )
      : null;
  const third = bronze?.winner_entry ? entryById.get(bronze.winner_entry) : null;

  if (status === "draft") {
    return (
      <section className="border-b-2 border-ink bg-bone-deep px-5 py-6 text-center">
        <p className="font-display text-lg uppercase">Judging not yet convened</p>
        <p className="mt-1 text-[13px] text-ink-soft">
          The adjudicator opens the head-to-head once enough cars are on file.
        </p>
        {isStaff ? (
          <button
            onClick={onDraw}
            disabled={liveCount < 2 || busy === "draw"}
            className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2.5 font-display text-xs uppercase tracking-widest text-bone shadow-[3px_3px_0_0_var(--color-stamp)] disabled:opacity-50"
          >
            {busy === "draw"
              ? "Convening…"
              : liveCount < 2
                ? "Need 2+ cars"
                : "Conduct the judging"}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="border-b-4 border-ink">
      {status === "complete" && champion ? (
        <div className="border-b-4 border-ink bg-hazard px-5 py-5">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em]">
            Ultimate carspot of the weekend
          </p>
          <div className="mt-3 flex flex-col items-center gap-3">
            <Podium
              place={1}
              entry={champion}
              url={urlFor(champion.storage_path)}
            />
            <div className="flex w-full justify-center gap-3">
              {runnerUp ? (
                <Podium
                  place={2}
                  entry={runnerUp}
                  url={urlFor(runnerUp.storage_path)}
                  small
                />
              ) : null}
              {third ? (
                <Podium
                  place={3}
                  entry={third}
                  url={urlFor(third.storage_path)}
                  small
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isStaff ? (
        <p className="border-b-2 border-ink bg-card px-5 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          Adjudicator mode — tap the winning car in each duel
        </p>
      ) : (
        <p className="border-b-2 border-ink bg-card px-5 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          The adjudication bracket · updates live
        </p>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4 p-4">
          {byRound.map(([round, roundMatches]) => (
            <div key={round} className="w-[210px] shrink-0">
              <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                {roundLabel(round, rounds)}
              </h3>
              <div className="space-y-2">
                {roundMatches.map((m) => (
                  <DuelCard
                    key={m.id}
                    match={m}
                    entryById={entryById}
                    urlFor={urlFor}
                    guestId={guestId}
                    isStaff={isStaff}
                    busy={busy === m.id}
                    onPick={(w) => onPick(m, w)}
                  />
                ))}
              </div>
            </div>
          ))}

          {bronze ? (
            <div className="w-[210px] shrink-0">
              <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                3rd-place playoff
              </h3>
              <DuelCard
                match={bronze}
                entryById={entryById}
                urlFor={urlFor}
                guestId={guestId}
                isStaff={isStaff}
                busy={busy === bronze.id}
                onPick={(w) => onPick(bronze, w)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DuelCard({
  match,
  entryById,
  urlFor,
  guestId,
  isStaff,
  busy,
  onPick,
}: {
  match: CarspotMatch;
  entryById: Map<string, CarspotEntryRow>;
  urlFor: (path: string) => string;
  guestId: string;
  isStaff: boolean;
  busy: boolean;
  onPick: (winner: string) => void;
}) {
  const done = match.status === "complete";

  return (
    <div className={`border-2 ${done ? "border-ink/35" : "border-ink"} bg-card`}>
      {([match.entry_a, match.entry_b] as const).map((id, idx) => {
        const entry = id ? entryById.get(id) : null;
        const won = done && match.winner_entry === id;
        const lost = done && id && match.winner_entry !== id;
        const isMine = entry?.guest_id === guestId;
        const canPick = isStaff && !!id && !done;

        return (
          <button
            key={idx}
            type="button"
            disabled={!canPick || busy}
            onClick={() => id && onPick(id)}
            className={`flex w-full items-center gap-2 p-1.5 text-left ${
              idx === 0 ? "border-b-2 border-bone-deep" : ""
            } ${won ? "bg-approved/12" : ""} ${lost ? "opacity-40" : ""} ${
              canPick ? "active:bg-hazard/40" : ""
            }`}
          >
            <span className="relative h-12 w-12 shrink-0 overflow-hidden border border-ink bg-ink">
              {entry && urlFor(entry.storage_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlFor(entry.storage_path)}
                  alt={entry.caption ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium">
                {entry ? (
                  entry.caption ?? "Unidentified"
                ) : (
                  <span className="font-mono text-[10px] text-ink-faint">
                    {done ? "Bye" : "TBD"}
                  </span>
                )}
              </span>
              {entry ? (
                <span className="block truncate font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                  {entry.display_name}
                  {isMine ? " · you" : ""}
                </span>
              ) : null}
            </span>
            {won ? (
              <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest text-approved">
                Won
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Podium({
  place,
  entry,
  url,
  small,
}: {
  place: 1 | 2 | 3;
  entry: CarspotEntryRow;
  url: string;
  small?: boolean;
}) {
  const size = small ? "h-20 w-20" : "h-28 w-28";
  const medal = place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
  return (
    <Link href={`/u/${entry.guest_id}`} className="text-center active:opacity-70">
      <div
        className={`relative ${size} mx-auto overflow-hidden border-2 border-ink bg-ink`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={entry.caption ?? ""} className="h-full w-full object-cover" />
        ) : null}
        <span className="absolute top-0 left-0 bg-ink px-1 py-0.5 font-display text-[10px] text-bone">
          {medal}
        </span>
      </div>
      <p className="mt-1 max-w-[7.5rem] truncate text-[12px] font-medium">
        {entry.caption ?? "Unidentified"}
      </p>
      <p className="truncate font-mono text-[9px] uppercase tracking-wide text-ink-soft">
        {entry.display_name}
      </p>
    </Link>
  );
}

function roundLabel(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "The Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}
