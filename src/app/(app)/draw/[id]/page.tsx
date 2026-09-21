import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { BracketView } from "@/components/BracketView";
import { TournamentSetup } from "@/components/TournamentSetup";
import type { StaffGuest } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function GameBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("guests")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isStaff = me?.role === "host" || me?.role === "helper";

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const [{ data: entrants }, { data: matches }, staffGuests] =
    await Promise.all([
      supabase
        .from("tournament_entrants")
        .select("id, guest_id, seed, eliminated_at, guests(display_name)")
        .eq("tournament_id", id),
      supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id)
        .order("round")
        .order("slot"),
      isStaff
        ? supabase.rpc("staff_guest_list")
        : Promise.resolve({ data: null }),
    ]);

  const names = new Map<string, string>();
  const guestByEntrant = new Map<string, string>();
  for (const e of entrants ?? []) {
    const g = e.guests as unknown as { display_name: string } | null;
    names.set(e.id, g?.display_name ?? "Unknown");
    guestByEntrant.set(e.id, e.guest_id);
  }

  const currentEntrantGuestIds = (entrants ?? []).map((e) => e.guest_id);

  return (
    <main>
      <div className="bg-[#0b1020] px-4 pt-3">
        <Link
          href="/draw"
          className="font-arcade text-[9px] uppercase tracking-wide text-white/60 active:text-white"
        >
          ‹ All games
        </Link>
      </div>
      <PageHero
        theme="tournament"
        kicker={tournament.status === "complete" ? "FINISHED" : "ROUND 1 · FIGHT"}
        title={tournament.name}
      />

      {isStaff ? (
        <TournamentSetup
          tournamentId={tournament.id}
          status={tournament.status}
          guests={(staffGuests?.data ?? []) as StaffGuest[]}
          currentEntrantGuestIds={currentEntrantGuestIds}
          hasMatches={(matches ?? []).length > 0}
        />
      ) : null}

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
