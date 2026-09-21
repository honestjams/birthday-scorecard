"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import {
  formatGap,
  formatLapTime,
  lapTimeError,
  ordinal,
  parseLapTime,
} from "@/lib/format";
import type { KartTime, LeaderboardRow } from "@/types/database";

export function KartBoard({
  initialBoard,
  initialMine,
  guestId,
  open,
}: {
  initialBoard: LeaderboardRow[];
  initialMine: KartTime[];
  guestId: string;
  open: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [board, setBoard] = useState(initialBoard);
  const [mine, setMine] = useState(initialMine);
  const [input, setInput] = useState("");
  const [session, setSession] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: b }, { data: m }] = await Promise.all([
      supabase
        .from("kart_leaderboard")
        .select("*")
        .order("time_ms", { ascending: true }),
      supabase
        .from("kart_times")
        .select("*")
        .eq("guest_id", guestId)
        .order("time_ms", { ascending: true }),
    ]);
    if (b) setBoard(b as LeaderboardRow[]);
    if (m) setMine(m as KartTime[]);
  }, [supabase, guestId]);

  // Live board: every phone in the pit lane updates together.
  // Realtime is the fast path; the interval is the safety net, because venue
  // and guest-network wifi frequently blocks WebSockets outright.
  useEffect(() => {
    const channel = supabase
      .channel("kart-times")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kart_times" },
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

  const myBest = mine[0]?.time_ms ?? null;
  const leader = board[0]?.time_ms ?? null;
  const myPosition = board.findIndex((r) => r.guest_id === guestId) + 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const ms = parseLapTime(input);
    if (ms === null) {
      setError("Try 52.418 or 1:02.418.");
      return;
    }
    const rangeError = lapTimeError(ms);
    if (rangeError) {
      setError(rangeError);
      return;
    }

    setBusy(true);
    const improved = myBest === null || ms < myBest;

    const { error: dbError } = await supabase.from("kart_times").insert({
      guest_id: guestId,
      time_ms: ms,
      session_label: session.trim() || null,
    });

    if (dbError) {
      setError(
        dbError.message.includes("row-level security")
          ? "The register is closed."
          : "Could not record that. Try again.",
      );
      setBusy(false);
      return;
    }

    setInput("");
    await refresh();
    setBusy(false);

    if (improved) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1800);
    }
  }

  return (
    <>
      {/* ---- declaration form ---- */}
      <section className="border-b-4 border-ink bg-card px-5 py-5">
        {open ? (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
                Declared lap time
              </span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                inputMode="decimal"
                placeholder="52.418"
                aria-label="Lap time"
                className="mt-2 w-full border-2 border-ink bg-white px-3 py-3 text-center font-mono text-2xl tracking-widest outline-none focus:ring-4 focus:ring-hazard"
              />
            </label>

            <input
              value={session}
              onChange={(e) => setSession(e.target.value)}
              maxLength={24}
              placeholder="Heat / session (optional)"
              aria-label="Session label"
              className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-hazard"
            />

            {error ? (
              <p
                role="alert"
                className="animate-shake border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep"
              >
                {error}
              </p>
            ) : null}

            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="min-h-[52px] w-full border-2 border-ink bg-ink px-4 py-3 font-display text-sm uppercase tracking-[0.18em] text-bone shadow-[4px_4px_0_0_var(--color-stamp)] disabled:opacity-60"
            >
              {busy ? "Recording…" : "Lodge declaration"}
            </motion.button>
          </form>
        ) : (
          <p className="border-2 border-ink bg-hazard px-3 py-3 text-center font-mono text-[11px] uppercase tracking-widest">
            The register is closed
          </p>
        )}

        {myBest !== null ? (
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Your best: <span className="text-ink">{formatLapTime(myBest)}</span>
            {myPosition > 0 ? ` · currently ${ordinal(myPosition)}` : ""}
          </p>
        ) : null}
      </section>

      {/* ---- the board ---- */}
      <section className="px-4 py-5 pb-10">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="font-display text-lg uppercase tracking-tight">
            Standings
          </h2>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stamp" />
            Live
          </span>
        </div>

        {board.length === 0 ? (
          <p className="doc-soft px-4 py-8 text-center text-sm text-ink-faint">
            No times on the register. The track is wide open.
          </p>
        ) : (
          <ol className="space-y-1.5">
            <AnimatePresence initial={false}>
              {board.map((row, i) => (
                <motion.li
                  key={row.guest_id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className={`flex items-center gap-3 border-2 px-3 py-2.5 ${
                    row.guest_id === guestId
                      ? "border-stamp bg-stamp/6"
                      : "border-ink bg-card"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center font-display text-sm ${
                      i === 0
                        ? "bg-hazard text-ink"
                        : i < 3
                          ? "bg-ink text-bone"
                          : "border-2 border-ink text-ink"
                    }`}
                  >
                    {i + 1}
                  </span>

                  <Link
                    href={`/u/${row.guest_id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
                  >
                    <Avatar
                      name={row.display_name}
                      url={row.avatar_url}
                      size={32}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {row.display_name}
                      {row.verified ? (
                        <span className="ml-1.5 font-mono text-[9px] uppercase tracking-widest text-approved">
                          ✓ verified
                        </span>
                      ) : null}
                    </span>
                  </Link>

                  <span className="text-right">
                    <span className="block font-mono text-base font-semibold tabular-nums">
                      {formatLapTime(row.time_ms)}
                    </span>
                    {leader !== null && i > 0 ? (
                      <span className="block font-mono text-[10px] text-ink-faint tabular-nums">
                        {formatGap(row.time_ms, leader)}
                      </span>
                    ) : null}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}

        {mine.length > 1 ? (
          <details className="mt-5 doc-soft px-4 py-3">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest">
              Your {mine.length} declared laps
            </summary>
            <ul className="mt-3 space-y-1">
              {mine.map((t, i) => (
                <li
                  key={t.id}
                  className="flex justify-between border-b border-bone-deep py-1 font-mono text-sm tabular-nums last:border-0"
                >
                  <span className="text-ink-faint">
                    {i === 0 ? "Best" : `#${i + 1}`}
                    {t.session_label ? ` · ${t.session_label}` : ""}
                  </span>
                  <span>{formatLapTime(t.time_ms)}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <AnimatePresence>
        {celebrate ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <span className="stamp animate-stamp-in bg-bone/95 px-6 py-3 text-2xl">
              Personal Best
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
