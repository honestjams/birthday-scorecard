import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
import { CarspotBoard, type CarspotEntryRow } from "@/components/CarspotBoard";
import type { CarspotMatch } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CarspotPage() {
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

  const [{ data: settings }, { data: entries }, { data: matches }] =
    await Promise.all([
      supabase
        .from("app_settings")
        .select("carspot_open, carspot_status, carspot_rounds")
        .single(),
      supabase
        .from("carspot_entries")
        .select("*, guests(display_name, avatar_url)")
        .order("created_at", { ascending: false }),
      supabase
        .from("carspot_matches")
        .select("*")
        .order("round")
        .order("slot"),
    ]);

  const rows: CarspotEntryRow[] = (entries ?? []).map((e) => {
    const g = e.guests as unknown as {
      display_name: string;
      avatar_url: string | null;
    } | null;
    return {
      id: e.id,
      guest_id: e.guest_id,
      storage_path: e.storage_path,
      caption: e.caption,
      location: e.location,
      voided: e.voided,
      void_reason: e.void_reason,
      created_at: e.created_at,
      display_name: g?.display_name ?? "Unknown",
      avatar_url: g?.avatar_url ?? null,
    };
  });

  const paths = rows.map((r) => r.storage_path);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("carspot-photos")
      .createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) urls.set(s.path, s.signedUrl);
    });
  }

  return (
    <main>
      <Masthead
        title="Carspotting Bureau"
        formCode="F-11"
        subtitle="File the finest car you spot all weekend. Duplicates are void — spot something nobody else will. The adjudicator's eye is final."
      />
      <CarspotBoard
        initialEntries={rows}
        initialUrls={Object.fromEntries(urls)}
        initialMatches={(matches ?? []) as CarspotMatch[]}
        guestId={user!.id}
        isStaff={isStaff}
        open={settings?.carspot_open ?? true}
        status={settings?.carspot_status ?? "draft"}
        rounds={settings?.carspot_rounds ?? 0}
      />
    </main>
  );
}
