import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
import { AdminPanel } from "@/components/admin/AdminPanel";
import type {
  AppSettings,
  BingoSquare,
  PointAward,
  ScoringConfig,
  StaffGuest,
  Tournament,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("guests")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (me?.role !== "host" && me?.role !== "helper") redirect("/bingo");

  const [
    { data: settings },
    { data: guests },
    { data: squares },
    { data: tournaments },
    { data: scoring },
    { data: awards },
  ] = await Promise.all([
    supabase.from("app_settings").select("*").single(),
    supabase.rpc("staff_guest_list"),
    supabase.from("bingo_squares").select("*").order("position"),
    supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("scoring_config").select("*"),
    supabase
      .from("point_awards")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main>
      <Masthead
        title="Bureau Controls"
        formCode="F-00"
        subtitle="Restricted. Actions taken here are immediate and visible to every attendee."
      />
      <AdminPanel
        isHost={me.role === "host"}
        settings={settings as AppSettings}
        guests={(guests ?? []) as StaffGuest[]}
        squares={(squares ?? []) as BingoSquare[]}
        tournaments={(tournaments ?? []) as Tournament[]}
        scoring={(scoring ?? []) as ScoringConfig[]}
        awards={(awards ?? []) as PointAward[]}
      />
    </main>
  );
}
