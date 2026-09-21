import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
import { KartBoard } from "@/components/KartBoard";
import type { KartTime, LeaderboardRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function KartsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: board }, { data: mine }, { data: settings }] =
    await Promise.all([
      supabase
        .from("kart_leaderboard")
        .select("*")
        .order("time_ms", { ascending: true }),
      supabase
        .from("kart_times")
        .select("*")
        .eq("guest_id", user!.id)
        .order("time_ms", { ascending: true }),
      supabase.from("app_settings").select("kart_open").single(),
    ]);

  return (
    <main>
      <Masthead
        title="Lap Time Register"
        formCode="F-7B"
        subtitle="Declare your fastest lap. Declarations are made under the honour system, which has never once failed."
      />
      <KartBoard
        initialBoard={(board ?? []) as LeaderboardRow[]}
        initialMine={(mine ?? []) as KartTime[]}
        guestId={user!.id}
        open={settings?.kart_open ?? true}
      />
    </main>
  );
}
