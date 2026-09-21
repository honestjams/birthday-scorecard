"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StaffGuest, Tournament } from "@/types/database";

export function TournamentTab({
  guests,
  tournaments,
}: {
  guests: StaffGuest[];
  tournaments: Tournament[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState("The Championship");
  const [game, setGame] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = tournaments[0] ?? null;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createAndDraw() {
    if (selected.size < 2) {
      setError("Pick at least two entrants.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { data: t, error: tErr } = await supabase
        .from("tournaments")
        .insert({ name: name.trim() || "The Championship", game: game.trim() || null })
        .select()
        .single();
      if (tErr) throw tErr;

      const { error: eErr } = await supabase
        .from("tournament_entrants")
        .insert(
          [...selected].map((guest_id) => ({
            tournament_id: t.id,
            guest_id,
          })),
        );
      if (eErr) throw eErr;

      const { error: dErr } = await supabase.rpc("generate_draw", {
        p_tournament_id: t.id,
      });
      if (dErr) throw dErr;

      setMessage("Draw conducted. Every entrant can now see their rival.");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the draw.");
    } finally {
      setBusy(false);
    }
  }

  async function redraw(id: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("generate_draw", {
      p_tournament_id: id,
    });
    if (err) setError(err.message);
    else setMessage("Re-drawn. All previous results have been cleared.");
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await supabase.from("tournaments").delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {current ? (
        <section className="doc-soft p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Current tournament
          </p>
          <p className="mt-1 font-display text-lg uppercase">{current.name}</p>
          <p className="text-[12px] text-ink-soft">
            {current.game ? `${current.game} · ` : ""}
            {current.rounds ?? 0} rounds · {current.status}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              onClick={() => redraw(current.id)}
              className="flex-1 border-2 border-ink px-2 py-2 font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              Re-draw
            </button>
            <button
              disabled={busy}
              onClick={() => remove(current.id)}
              className="flex-1 border-2 border-stamp px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-stamp disabled:opacity-50"
            >
              Delete
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">
            Re-drawing wipes every recorded result for this tournament and
            reshuffles from scratch.
          </p>
        </section>
      ) : null}

      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          New tournament
        </h2>

        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Title
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border-2 border-ink bg-white px-3 py-2"
          />
        </label>

        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Game (optional)
          </span>
          <input
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="Beer pong, Mario Kart, arm wrestling…"
            className="mt-1 w-full border-2 border-ink bg-white px-3 py-2"
          />
        </label>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Entrants · {selected.size} selected
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setSelected(new Set(guests.map((g) => g.id)))}
            className="border-2 border-ink/30 px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="border-2 border-ink/30 px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
          >
            None
          </button>
        </div>

        <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
          {guests.map((g) => (
            <li key={g.id}>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 border-2 border-ink/20 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggle(g.id)}
                  className="h-5 w-5 accent-[var(--color-stamp)]"
                />
                <span className="truncate text-sm">{g.display_name}</span>
              </label>
            </li>
          ))}
        </ul>

        {error ? (
          <p className="mt-3 border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 border-2 border-approved bg-approved/10 px-3 py-2 text-sm text-approved">
            {message}
          </p>
        ) : null}

        <button
          disabled={busy}
          onClick={createAndDraw}
          className="mt-4 min-h-[52px] w-full border-2 border-ink bg-ink px-4 py-3 font-display text-sm uppercase tracking-[0.18em] text-bone shadow-[4px_4px_0_0_var(--color-stamp)] disabled:opacity-60"
        >
          {busy ? "Conducting…" : "Conduct the draw"}
        </button>
        <p className="mt-2 text-[11px] text-ink-faint">
          Entrants are shuffled server-side, so nobody — including you — can
          influence who draws whom. Odd numbers get byes, spread evenly.
        </p>
      </section>
    </div>
  );
}
