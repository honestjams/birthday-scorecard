"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/types/database";

const STATUS: Record<string, string> = {
  draft: "Not started",
  live: "In progress",
  complete: "Finished",
};

export function TournamentTab({ tournaments }: { tournaments: Tournament[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addGame() {
    if (!name.trim()) {
      setError("Give the game a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("tournaments")
      .insert({ name: name.trim(), game: name.trim() });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setName("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this game and its bracket?")) return;
    setBusy(true);
    await supabase.from("tournaments").delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">Games</h2>
        <p className="mt-1 mb-3 text-[12px] text-ink-faint">
          Run each game&apos;s draw from its own page on the day — open a game,
          pick the players, and draw.
        </p>

        {tournaments.length === 0 ? (
          <p className="text-sm text-ink-faint">No games yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {tournaments.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    {STATUS[t.status] ?? t.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/draw/${t.id}`}
                    className="rounded-lg border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => remove(t.id)}
                    disabled={busy}
                    className="font-mono text-[10px] uppercase tracking-widest text-stamp disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          Add a game
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Game name"
          className="mt-3 w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 outline-none focus:border-accent focus:bg-white"
        />
        {error ? (
          <p className="mt-2 rounded-lg border border-stamp/40 bg-stamp/8 px-3 py-2 text-sm text-stamp-deep">
            {error}
          </p>
        ) : null}
        <button
          onClick={addGame}
          disabled={busy}
          className="btn btn-primary mt-3 w-full text-sm uppercase tracking-wide disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add game"}
        </button>
      </section>
    </div>
  );
}
