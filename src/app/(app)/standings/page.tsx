import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
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
      <Masthead
        title="The Overall Standing"
        formCode="F-10"
        subtitle="Points across every activity. Karting and carspotting carry the most weight. One attendee will be crowned."
      />
      <StandingsBoard
        initialRows={(rows ?? []) as StandingsRow[]}
        initialAwards={(awards ?? []) as PointAward[]}
        myGuestId={user!.id}
      />
    </main>
  );
}
