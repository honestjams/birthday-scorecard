"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/types/database";

type Props = {
  tournamentId: string;
  status: string;
  rounds: number;
  initialMatches: Match[];
  names: Record<string, string>;
  guestByEntrant: Record<string, string>;
  myGuestId: string;
  isStaff: boolean;
};

export function BracketView({
  tournamentId,
  status,
  rounds,
  initialMatches,
  names,
  guestByEntrant,
  myGuestId,
  isStaff,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [matches, setMatches] = useState(initialMatches);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round")
      .order("slot");
    if (data) setMatches(data as Match[]);
  }, [supabase, tournamentId]);

  useEffect(() => {
    const channel = supabase
      .channel(`bracket-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => void refresh(),
      )
      .subscribe();

    // Safety net for networks that block WebSockets.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [supabase, tournamentId, refresh]);

  const byRound = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      const list = map.get(m.round) ?? [];
      list.push(m);
      map.set(m.round, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [matches]);

  // The one thing every guest actually wants to know.
  const myNextMatch = useMemo(() => {
    const mine = matches.filter((m) => {
      if (m.status === "complete") return false;
      const a = m.entrant_a ? guestByEntrant[m.entrant_a] : null;
      const b = m.entrant_b ? guestByEntrant[m.entrant_b] : null;
      return a === myGuestId || b === myGuestId;
    });
    return mine.sort((x, y) => x.round - y.round)[0] ?? null;
  }, [matches, guestByEntrant, myGuestId]);

  const myRival = useMemo(() => {
    if (!myNextMatch) return null;
    const aIsMe =
      myNextMatch.entrant_a &&
      guestByEntrant[myNextMatch.entrant_a] === myGuestId;
    const rivalEntrant = aIsMe ? myNextMatch.entrant_b : myNextMatch.entrant_a;
    return rivalEntrant ? (names[rivalEntrant] ?? null) : null;
  }, [myNextMatch, guestByEntrant, myGuestId, names]);

  const champion = useMemo(() => {
    const final = matches.find((m) => m.round === rounds);
    return final?.winner_entrant ? names[final.winner_entrant] : null;
  }, [matches, rounds, names]);

  async function recordWinner(match: Match, winner: string) {
    if (!isStaff || busy) return;
    setBusy(match.id);
    setError(null);
    const { error: rpcError } = await supabase.rpc("advance_match", {
      p_match_id: match.id,
      p_winner: winner,
    });
    if (rpcError) setError(rpcError.message);
    await refresh();
    setBusy(null);
  }

  if (matches.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-display text-lg uppercase">Bracket not set yet</p>
        <p className="mt-2 text-sm text-ink-soft">
          The draw hasn&apos;t been made. Hang tight.
        </p>
      </div>
    );
  }

  return (
    <>
      {champion ? (
        <div
          className="px-5 py-6 text-center text-white"
          style={{ background: "linear-gradient(120deg,#131a33,#2f7bff)" }}
        >
          <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#ffb400]">
            Winner
          </p>
          <p className="mt-2.5 font-display text-3xl uppercase">{champion}</p>
          <p className="mt-1 text-[12px] text-white/70">takes the tournament</p>
        </div>
      ) : myNextMatch ? (
        <div className="border-b border-line bg-ink px-5 py-4 text-white">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
            Round {myNextMatch.round} · your next match
          </p>
          <p className="mt-1 font-display text-2xl uppercase">
            {myRival ?? "Waiting on opponent"}
          </p>
          {!myRival ? (
            <p className="mt-1 text-[12px] text-white/70">
              Your opponent is still being decided one round below.
            </p>
          ) : null}
        </div>
      ) : status === "live" ? (
        <div className="border-b border-line bg-surface-2 px-5 py-4 text-center">
          <p className="text-sm font-semibold">You&apos;re out</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            Thanks for playing — cheer on the rest.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mx-4 mt-4 border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep">
          {error}
        </p>
      ) : null}

      {isStaff ? (
        <p className="border-b border-line bg-surface-2 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          Host — tap the winner of each match
        </p>
      ) : null}

      <div className="overflow-x-auto pb-10">
        <div className="flex min-w-max gap-4 p-4">
          {byRound.map(([round, roundMatches]) => (
            <section key={round} className="w-[224px] shrink-0">
              <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                {roundLabel(round, rounds)}
              </h2>
              <div className="space-y-2">
                {roundMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    names={names}
                    guestByEntrant={guestByEntrant}
                    myGuestId={myGuestId}
                    isStaff={isStaff}
                    busy={busy === m.id}
                    onPick={(w) => recordWinner(m, w)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function MatchCard({
  match,
  names,
  guestByEntrant,
  myGuestId,
  isStaff,
  busy,
  onPick,
}: {
  match: Match;
  names: Record<string, string>;
  guestByEntrant: Record<string, string>;
  myGuestId: string;
  isStaff: boolean;
  busy: boolean;
  onPick: (winner: string) => void;
}) {
  const done = match.status === "complete";

  return (
    <div
      className={`border-2 ${done ? "border-ink/35" : "border-ink"} bg-card`}
    >
      <p className="border-b border-bone-deep px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-ink-faint">
        Match {match.slot}
      </p>
      {([match.entrant_a, match.entrant_b] as const).map((entrant, idx) => {
        const label = entrant ? names[entrant] : null;
        const isMe = entrant ? guestByEntrant[entrant] === myGuestId : false;
        const won = done && match.winner_entrant === entrant;
        const lost = done && entrant && match.winner_entrant !== entrant;

        return (
          <motion.button
            key={idx}
            type="button"
            disabled={!isStaff || !entrant || done || busy}
            whileTap={isStaff && entrant && !done ? { scale: 0.97 } : undefined}
            onClick={() => entrant && onPick(entrant)}
            className={`flex w-full items-center gap-2 px-2 py-2.5 text-left ${
              idx === 0 ? "border-b border-bone-deep" : ""
            } ${won ? "bg-approved/12" : ""} ${lost ? "opacity-45" : ""} ${
              isStaff && entrant && !done ? "active:bg-hazard/40" : ""
            }`}
          >
            <span
              className={`min-w-0 flex-1 truncate text-sm ${
                won ? "font-semibold" : ""
              } ${isMe ? "text-stamp" : ""}`}
            >
              {label ?? (
                <span className="font-mono text-[11px] text-ink-faint">
                  {done ? "Bye" : "TBD"}
                </span>
              )}
              {isMe ? (
                <span className="ml-1 font-mono text-[9px] uppercase">you</span>
              ) : null}
            </span>
            {won ? (
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-approved">
                Won
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

function roundLabel(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "The Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}
