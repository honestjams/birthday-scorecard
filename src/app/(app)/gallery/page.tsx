import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
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
      <PageHero theme="default" kicker="THE ARCHIVE" title="Photo Archive">
        <p className="max-w-[34ch] text-[13px] leading-snug text-white/85">
          Every photo from the weekend, all in one place.
        </p>
      </PageHero>
      <GalleryGrid items={items} />
    </main>
  );
}
