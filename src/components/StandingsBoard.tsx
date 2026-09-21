"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import type { PointAward, StandingsRow } from "@/types/database";

const CATEGORY_LABEL: Record<string, string> = {
  carspotting: "Carspot",
  karting: "Karts",
  tournament: "Tournament",
  bingo: "Bingo",
  bonus: "Bonus",
};

export function StandingsBoard({
  initialRows,
  initialAwards,
  myGuestId,
}: {
  initialRows: StandingsRow[];
  initialAwards: PointAward[];
  myGuestId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initialRows);
  const [awards, setAwards] = useState(initialAwards);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase
        .from("standings")
        .select("*")
        .order("total_points", { ascending: false }),
      supabase.from("point_awards").select("*"),
    ]);
    if (r) setRows(r as StandingsRow[]);
    if (a) setAwards(a as PointAward[]);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("standings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "point_awards" },
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

  const awardsByGuest = useMemo(() => {
    const map = new Map<string, PointAward[]>();
    for (const a of awards) {
      const list = map.get(a.guest_id) ?? [];
      list.push(a);
      map.set(a.guest_id, list);
    }
    return map;
  }, [awards]);

  // Only rank people who have actually scored; everyone else is "unplaced".
  const scored = rows.filter((r) => r.total_points > 0);
  const unscored = rows.filter((r) => r.total_points <= 0);

  if (scored.length === 0) {
    return (
      <div className="px-5 py-10">
        <div className="doc px-5 py-10 text-center">
          <p className="font-display text-lg uppercase">No points yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            The board fills as karting, carspotting, the tournament and bingo
            are decided over the weekend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 pb-10">
      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {scored.map((row, i) => {
            const guestAwards = awardsByGuest.get(row.guest_id) ?? [];
            const byCat = new Map<string, number>();
            for (const a of guestAwards)
              byCat.set(a.category, (byCat.get(a.category) ?? 0) + a.points);
            const isOpen = expanded === row.guest_id;

            return (
              <motion.li
                key={row.guest_id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={`border-2 ${
                  row.guest_id === myGuestId
                    ? "border-stamp bg-stamp/6"
                    : "border-ink bg-card"
                }`}
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center font-display text-base ${
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
                    className="flex min-w-0 flex-1 items-center gap-2.5 active:opacity-70"
                  >
                    <Avatar
                      name={row.display_name}
                      url={row.avatar_url}
                      size={36}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {row.display_name}
                      {row.guest_id === myGuestId ? (
                        <span className="ml-1 font-mono text-[9px] uppercase text-stamp">
                          you
                        </span>
                      ) : null}
                    </span>
                  </Link>

                  <button
                    onClick={() =>
                      setExpanded(isOpen ? null : row.guest_id)
                    }
                    className="shrink-0 text-right"
                    aria-label="Toggle breakdown"
                  >
                    <span className="block font-display text-xl leading-none tabular-nums">
                      {row.total_points}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                      pts {isOpen ? "▲" : "▾"}
                    </span>
                  </button>
                </div>

                {byCat.size > 0 ? (
                  <div className="flex flex-wrap gap-1 px-3 pb-2">
                    {[...byCat.entries()].map(([cat, pts]) => (
                      <span
                        key={cat}
                        className="border border-ink/25 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-ink-soft"
                      >
                        {CATEGORY_LABEL[cat] ?? cat} {pts}
                      </span>
                    ))}
                  </div>
                ) : null}

                {isOpen ? (
                  <ul className="border-t-2 border-bone-deep px-3 py-2">
                    {guestAwards
                      .slice()
                      .sort((a, b) => b.points - a.points)
                      .map((a) => (
                        <li
                          key={a.id}
                          className="flex justify-between gap-3 border-b border-bone-deep py-1 text-[12px] last:border-0"
                        >
                          <span className="min-w-0 truncate text-ink-soft">
                            {a.label}
                          </span>
                          <span className="shrink-0 font-mono tabular-nums">
                            +{a.points}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      {unscored.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            Yet to score
          </p>
          <div className="flex flex-wrap gap-2">
            {unscored.map((row) => (
              <Link
                key={row.guest_id}
                href={`/u/${row.guest_id}`}
                className="flex items-center gap-1.5 border-2 border-ink/20 px-2 py-1 active:opacity-70"
              >
                <Avatar name={row.display_name} url={row.avatar_url} size={18} />
                <span className="truncate text-[11px]">{row.display_name}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
