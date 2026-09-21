"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  PointAward,
  ScoringCategory,
  ScoringConfig,
  StaffGuest,
} from "@/types/database";

const CATEGORIES: { key: ScoringCategory; label: string }[] = [
  { key: "carspotting", label: "Carspotting" },
  { key: "karting", label: "Karting" },
  { key: "tournament", label: "Game tournament" },
  { key: "bingo", label: "Photo bingo" },
];

export function PointsTab({
  guests,
  scoring,
  awards,
}: {
  guests: StaffGuest[];
  scoring: ScoringConfig[];
  awards: PointAward[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [values, setValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const s of scoring) map[`${s.category}-${s.place}`] = s.points;
    return map;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // manual bonus form
  const [guestId, setGuestId] = useState("");
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState("");

  const guestName = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of guests) map.set(g.id, g.display_name);
    return map;
  }, [guests]);

  const manualAwards = awards.filter((a) => a.source === "manual");

  async function recompute() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: err } = await supabase.rpc("recompute_auto_awards");
    if (err) setError(err.message);
    else setMessage("Standings recomputed from the latest results.");
    setBusy(false);
    router.refresh();
  }

  async function savePoints(category: string, place: number, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setValues((v) => ({ ...v, [`${category}-${place}`]: n }));
    await supabase
      .from("scoring_config")
      .update({ points: Math.round(n) })
      .eq("category", category)
      .eq("place", place);
  }

  async function addBonus() {
    const n = Number(points);
    if (!guestId) {
      setError("Choose who the bonus is for.");
      return;
    }
    if (!label.trim() || !Number.isFinite(n) || n === 0) {
      setError("A label and a non-zero points value are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("point_awards").insert({
      guest_id: guestId,
      category: "bonus",
      label: label.trim(),
      points: Math.round(n),
      source: "manual",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setLabel("");
    setPoints("");
    setGuestId("");
    setMessage("Bonus awarded.");
    router.refresh();
  }

  async function removeAward(id: string) {
    setBusy(true);
    await supabase.from("point_awards").delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border-2 border-approved bg-approved/10 px-3 py-2 text-sm text-approved">
          {message}
        </p>
      ) : null}

      {/* ---- recompute ---- */}
      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          Recompute the standings
        </h2>
        <p className="mt-1 mb-3 text-[12px] text-ink-faint">
          Pulls the top three from karting (fastest laps), photo bingo (most
          squares filed), the carspot bracket and the game tournament, and
          awards points using the values below. Manual bonuses are kept. Run
          this whenever a result changes.
        </p>
        <button
          onClick={recompute}
          disabled={busy}
          className="min-h-[48px] w-full border-2 border-ink bg-ink px-4 py-3 font-display text-sm uppercase tracking-[0.18em] text-bone shadow-[4px_4px_0_0_var(--color-stamp)] disabled:opacity-60"
        >
          {busy ? "Working…" : "Recompute now"}
        </button>
      </section>

      {/* ---- point values ---- */}
      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          Point values
        </h2>
        <p className="mt-1 mb-3 text-[12px] text-ink-faint">
          Points for 1st / 2nd / 3rd in each activity. Changing these takes
          effect on the next recompute.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_repeat(3,3rem)] items-center gap-2">
            <span />
            {[1, 2, 3].map((p) => (
              <span
                key={p}
                className="text-center font-mono text-[9px] uppercase tracking-widest text-ink-faint"
              >
                {p === 1 ? "1st" : p === 2 ? "2nd" : "3rd"}
              </span>
            ))}
          </div>
          {CATEGORIES.map(({ key, label: catLabel }) => (
            <div
              key={key}
              className="grid grid-cols-[1fr_repeat(3,3rem)] items-center gap-2"
            >
              <span className="truncate text-[13px]">{catLabel}</span>
              {[1, 2, 3].map((place) => (
                <input
                  key={place}
                  type="number"
                  inputMode="numeric"
                  value={values[`${key}-${place}`] ?? 0}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [`${key}-${place}`]: Number(e.target.value),
                    }))
                  }
                  onBlur={(e) => savePoints(key, place, e.target.value)}
                  aria-label={`${catLabel} place ${place} points`}
                  className="w-full border-2 border-ink bg-white px-1 py-1.5 text-center font-mono tabular-nums"
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---- manual bonus ---- */}
      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          Discretionary bonus
        </h2>
        <p className="mt-1 mb-3 text-[12px] text-ink-faint">
          Award points by hand — a spot prize, a penalty (use a negative
          number), or the game tournament&apos;s 3rd place.
        </p>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Recipient
          </span>
          <select
            value={guestId}
            onChange={(e) => setGuestId(e.target.value)}
            className="mt-1 w-full border-2 border-ink bg-white px-3 py-2"
          >
            <option value="">Choose…</option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.display_name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Reason
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder="Best dressed, tournament 3rd, etc."
            className="mt-1 w-full border-2 border-ink bg-white px-3 py-2"
          />
        </label>

        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Points
          </span>
          <input
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            type="number"
            inputMode="numeric"
            placeholder="20"
            className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 font-mono tabular-nums"
          />
        </label>

        <button
          onClick={addBonus}
          disabled={busy}
          className="mt-4 min-h-[48px] w-full border-2 border-ink bg-card px-4 py-3 font-display text-sm uppercase tracking-[0.18em] shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-60"
        >
          Award bonus
        </button>

        {manualAwards.length > 0 ? (
          <ul className="mt-4 space-y-1.5">
            {manualAwards.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 border-2 border-ink/25 px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-[12px]">
                  <span className="font-medium">
                    {guestName.get(a.guest_id) ?? "Unknown"}
                  </span>
                  <span className="text-ink-faint"> · {a.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm tabular-nums">
                    {a.points > 0 ? "+" : ""}
                    {a.points}
                  </span>
                  <button
                    onClick={() => removeAward(a.id)}
                    disabled={busy}
                    aria-label="Remove bonus"
                    className="font-mono text-[10px] uppercase tracking-widest text-stamp underline underline-offset-2 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
