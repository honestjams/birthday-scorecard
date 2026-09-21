import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
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
        <Masthead
          title="The Official Draw"
          formCode="F-9"
          subtitle="Rivals are assigned at random and cannot be appealed."
        />
        <div className="px-5 py-10">
          <div className="doc px-5 py-10 text-center">
            <p className="font-display text-lg uppercase">No draw scheduled</p>
            <p className="mt-2 text-sm text-ink-soft">
              The Bureau has not yet convened. Check back after the karting.
            </p>
            {isStaff ? (
              <Link
                href="/admin"
                className="mt-5 inline-block border-2 border-ink bg-ink px-4 py-2.5 font-display text-xs uppercase tracking-widest text-bone"
              >
                Convene a tournament
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
      <Masthead
        title={tournament.name}
        formCode="F-9"
        subtitle={
          tournament.game
            ? `Discipline: ${tournament.game}. Rivals assigned at random.`
            : "Rivals assigned at random and not subject to appeal."
        }
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
