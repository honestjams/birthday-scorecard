import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { BracketView } from "@/components/BracketView";

export const dynamic = "force-dynamic";

export default async function DrawPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: guest } = await supabase
    .from("guests")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isStaff = guest?.role === "host" || guest?.role === "helper";

  // The most recent tournament that is not still a draft, else the newest one.
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  const tournament = tournaments?.[0] ?? null;

  if (!tournament) {
    return (
      <main>
        <PageHero theme="tournament" kicker="ROUND 1" title="The Tournament">
          <p className="max-w-[34ch] font-arcade text-[9px] leading-relaxed text-white/70">
            Random draw. Single elimination.
          </p>
        </PageHero>
        <div className="px-5 py-10">
          <div className="card px-5 py-10 text-center">
            <p className="font-display text-lg uppercase">No bracket yet</p>
            <p className="mt-2 text-sm text-ink-soft">
              The draw hasn&apos;t been made. Check back once the games begin.
            </p>
            {isStaff ? (
              <Link
                href="/admin"
                className="btn btn-accent mt-5 inline-flex text-sm uppercase tracking-wide"
              >
                Set up the tournament
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  const [{ data: entrants }, { data: matches }] = await Promise.all([
    supabase
      .from("tournament_entrants")
      .select("id, guest_id, seed, eliminated_at, guests(display_name)")
      .eq("tournament_id", tournament.id),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("round")
      .order("slot"),
  ]);

  const names = new Map<string, string>();
  const guestByEntrant = new Map<string, string>();
  for (const e of entrants ?? []) {
    const g = e.guests as unknown as { display_name: string } | null;
    names.set(e.id, g?.display_name ?? "Unknown");
    guestByEntrant.set(e.id, e.guest_id);
  }

  return (
    <main>
      <PageHero
        theme="tournament"
        kicker={tournament.game ? tournament.game : "ROUND 1 · FIGHT"}
        title={tournament.name}
      />
      <BracketView
        tournamentId={tournament.id}
        status={tournament.status}
        rounds={tournament.rounds ?? 0}
        initialMatches={matches ?? []}
        names={Object.fromEntries(names)}
        guestByEntrant={Object.fromEntries(guestByEntrant)}
        myGuestId={user!.id}
        isStaff={isStaff}
      />
    </main>
  );
}
