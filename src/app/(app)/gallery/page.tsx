import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
import { GalleryGrid, type GalleryItem } from "@/components/GalleryGrid";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("bingo_entries")
    .select(
      "id, storage_path, created_at, guest_id, square_id, guests(display_name), bingo_squares(title, position)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const paths = (entries ?? []).map((e) => e.storage_path);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("bingo-photos")
      .createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) urls.set(s.path, s.signedUrl);
    });
  }

  const items: GalleryItem[] = (entries ?? [])
    .map((e) => {
      const g = e.guests as unknown as { display_name: string } | null;
      const sq = e.bingo_squares as unknown as {
        title: string;
        position: number;
      } | null;
      return {
        id: e.id,
        url: urls.get(e.storage_path) ?? "",
        guestName: g?.display_name ?? "Unknown",
        squareTitle: sq?.title ?? "Unfiled",
        squarePosition: sq?.position ?? 0,
        createdAt: e.created_at,
      };
    })
    .filter((i) => i.url);

  return (
    <main>
      <Masthead
        title="The Archive"
        formCode="F-7C"
        subtitle="All evidence submitted to date, held on file for the official recap."
      />
      <GalleryGrid items={items} />
    </main>
  );
}
