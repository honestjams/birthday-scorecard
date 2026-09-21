import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
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
      <PageHero
        theme="karts"
        kicker="QUARTER MILE AT A TIME"
        title="Kart Times"
      >
        <p className="max-w-[34ch] text-[13px] leading-snug text-white/85">
          Log your fastest lap. Quickest time wins — no do-overs, no excuses.
        </p>
      </PageHero>
      <KartBoard
        initialBoard={(board ?? []) as LeaderboardRow[]}
        initialMine={(mine ?? []) as KartTime[]}
        guestId={user!.id}
        open={settings?.kart_open ?? true}
      />
    </main>
  );
}
