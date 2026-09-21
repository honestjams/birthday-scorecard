import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import type { Tournament } from "@/types/database";

export const dynamic = "force-dynamic";

type Row = Tournament & { tournament_entrants: { count: number }[] };

const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Not started", className: "border-line text-ink-faint" },
  live: { label: "In progress", className: "border-accent text-accent" },
  complete: { label: "Finished", className: "border-approved text-approved" },
};

export default async function DrawHubPage() {
  const supabase = await createClient();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*, tournament_entrants(count)")
    .order("created_at", { ascending: true });

  const rows = (tournaments ?? []) as Row[];

  return (
    <main>
      <PageHero theme="tournament" kicker="SELECT A GAME" title="The Tournament">
        <p className="max-w-[36ch] font-arcade text-[9px] leading-relaxed text-white/70">
          One bracket per game. Winners score points.
        </p>
      </PageHero>

      <div className="px-4 py-5 pb-10">
        {rows.length === 0 ? (
          <p className="card px-4 py-8 text-center text-sm text-ink-faint">
            No games loaded yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5">
            {rows.map((t) => {
              const s = STATUS[t.status] ?? STATUS.draft;
              const entrants = t.tournament_entrants?.[0]?.count ?? 0;
              return (
                <li key={t.id}>
                  <Link
                    href={`/draw/${t.id}`}
                    className="card flex h-full flex-col justify-between gap-3 p-3.5 active:scale-[0.98] transition-transform"
                  >
                    <span className="font-display text-[15px] leading-tight uppercase tracking-tight">
                      {t.name}
                    </span>
                    <span className="flex items-center justify-between gap-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${s.className}`}
                      >
                        {s.label}
                      </span>
                      <span className="font-mono text-[10px] text-ink-faint">
                        {entrants > 0 ? `${entrants}p` : "—"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
