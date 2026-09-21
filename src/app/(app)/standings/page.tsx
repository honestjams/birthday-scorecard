import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { StandingsBoard } from "@/components/StandingsBoard";
import type { PointAward, StandingsRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: awards }] = await Promise.all([
    supabase
      .from("standings")
      .select("*")
      .order("total_points", { ascending: false }),
    supabase.from("point_awards").select("*"),
  ]);

  return (
    <main>
      <PageHero theme="standings" kicker="THE OVERALL WINNER" title="Standings">
        <p className="max-w-[34ch] text-[13px] leading-snug text-white/85">
          Points from every game, combined. Karts and carspotting count for the
          most. One winner takes the weekend.
        </p>
      </PageHero>
      <StandingsBoard
        initialRows={(rows ?? []) as StandingsRow[]}
        initialAwards={(awards ?? []) as PointAward[]}
        myGuestId={user!.id}
      />
    </main>
  );
}
