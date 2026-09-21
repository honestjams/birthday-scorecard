"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StaffGuest } from "@/types/database";

/**
 * Host-only panel on a game's page: pick who's playing and run (or re-run)
 * the draw for this game on the day.
 */
export function TournamentSetup({
  tournamentId,
  status,
  guests,
  currentEntrantGuestIds,
  hasMatches,
}: {
  tournamentId: string;
  status: string;
  guests: StaffGuest[];
  currentEntrantGuestIds: string[];
  hasMatches: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(!hasMatches);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentEntrantGuestIds),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runDraw() {
    if (selected.size < 2) {
      setError("Pick at least two players.");
      return;
    }
    if (hasMatches && !confirm("Re-draw this game? All recorded results are cleared.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Clear any existing bracket so entrants can be replaced, then reseed.
      await supabase.from("matches").delete().eq("tournament_id", tournamentId);
      await supabase
        .from("tournament_entrants")
        .delete()
        .eq("tournament_id", tournamentId);

      const { error: insErr } = await supabase
        .from("tournament_entrants")
        .insert(
          [...selected].map((guest_id) => ({
            tournament_id: tournamentId,
            guest_id,
          })),
        );
      if (insErr) throw insErr;

      const { error: drawErr } = await supabase.rpc("generate_draw", {
        p_tournament_id: tournamentId,
      });
      if (drawErr) throw drawErr;

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the draw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-b border-line bg-surface-2 px-4 py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2"
      >
        <span className="text-sm font-semibold">
          Host setup
          <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            {hasMatches ? "bracket drawn" : "not drawn"}
          </span>
        </span>
        <span className="text-ink-faint">{open ? "▲" : "▾"}</span>
      </button>

      {open ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Players · {selected.size}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelected(new Set(guests.map((g) => g.id)))}
                className="rounded-lg border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
              >
                All
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-lg border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
              >
                None
              </button>
            </div>
          </div>

          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line bg-card p-1.5">
            {guests.map((g) => (
              <li key={g.id}>
                <label className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-2 active:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggle(g.id)}
                    className="h-5 w-5 accent-[var(--color-accent)]"
                  />
                  <span className="truncate text-sm">{g.display_name}</span>
                </label>
              </li>
            ))}
          </ul>

          {error ? (
            <p className="mt-2 rounded-lg border border-stamp/40 bg-stamp/8 px-3 py-2 text-sm text-stamp-deep">
              {error}
            </p>
          ) : null}

          <button
            onClick={runDraw}
            disabled={busy}
            className="btn btn-accent mt-3 w-full text-sm uppercase tracking-wide disabled:opacity-60"
          >
            {busy
              ? "Drawing…"
              : hasMatches
                ? "Re-draw this game"
                : "Run the draw"}
          </button>
          {hasMatches ? (
            <p className="mt-1.5 text-center text-[11px] text-ink-faint">
              Re-drawing clears every recorded result for {status === "complete" ? "this finished game" : "this game"}.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
