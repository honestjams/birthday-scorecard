import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
import { BingoGrid } from "@/components/BingoGrid";
import type { BingoEntry, BingoSquare } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BingoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: squares }, { data: entries }, { data: settings }] =
    await Promise.all([
      supabase
        .from("bingo_squares")
        .select("*")
        .eq("is_active", true)
        .order("position"),
      supabase.from("bingo_entries").select("*").eq("guest_id", user!.id),
      supabase.from("app_settings").select("bingo_open").single(),
    ]);

  // Signed URLs are generated per request; the bucket itself stays private.
  const paths = (entries ?? []).map((e) => e.storage_path);
  const signedByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("bingo-photos")
      .createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl);
    });
  }

  return (
    <main>
      <Masthead
        title="Evidence Card"
        formCode="F-7A"
        subtitle="Twenty-five items require photographic substantiation. Tap a box to file."
      />

      <BingoGrid
        squares={(squares ?? []) as BingoSquare[]}
        entries={(entries ?? []) as BingoEntry[]}
        signedUrls={Object.fromEntries(signedByPath)}
        guestId={user!.id}
        open={settings?.bingo_open ?? true}
      />
    </main>
  );
}
