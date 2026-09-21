import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
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
      <PageHero
        theme="bingo"
        kicker="PHOTO BINGO"
        title="Photo Bingo"
      >
        <p className="max-w-[34ch] text-[13px] leading-snug text-white/85">
          Tap a square, snap the photo, done. Fill a full row, column or
          diagonal to score a line.
        </p>
      </PageHero>

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
