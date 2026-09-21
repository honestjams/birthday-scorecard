import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/Masthead";
import { ProfileView } from "@/components/ProfileView";
import type { CarspotEntry, PointAward } from "@/types/database";

export const dynamic = "force-dynamic";

type MatchRow = {
  a: string | null;
  b: string | null;
  winner: string | null;
};

/** Wins and losses for a set of entrant/entry ids across completed matches. */
function tally(rows: MatchRow[], mine: Set<string>) {
  let wins = 0;
  let losses = 0;
  for (const m of rows) {
    const involved =
      (m.a && mine.has(m.a)) || (m.b && mine.has(m.b)) ? true : false;
    if (!involved) continue;
    // A bye (one side null) is not a contested result.
    if (!m.a || !m.b) continue;
    if (m.winner && mine.has(m.winner)) wins += 1;
    else losses += 1;
  }
  return { wins, losses };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isMe = user?.id === id;

  const { data: guest } = await supabase
    .from("guests")
    .select("id, display_name, avatar_url, role, created_at")
    .eq("id", id)
    .single();

  if (!guest) notFound();

  const [
    { data: awards },
    { data: carspotEntries },
    { data: bingoEntries },
    { data: myEntrants },
    { data: gameMatches },
    { data: carspotMatches },
  ] = await Promise.all([
    supabase
      .from("point_awards")
      .select("*")
      .eq("guest_id", id)
      .order("points", { ascending: false }),
    supabase
      .from("carspot_entries")
      .select("*")
      .eq("guest_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bingo_entries")
      .select("id, storage_path, created_at, bingo_squares(title, position)")
      .eq("guest_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("tournament_entrants").select("id").eq("guest_id", id),
    supabase
      .from("matches")
      .select("entrant_a, entrant_b, winner_entrant, status")
      .eq("status", "complete"),
    supabase
      .from("carspot_matches")
      .select("entry_a, entry_b, winner_entry, status")
      .eq("status", "complete"),
  ]);

  const totalPoints = (awards ?? []).reduce((s, a) => s + a.points, 0);

  // ---- wins / losses -----------------------------------------------------
  const myEntrantIds = new Set((myEntrants ?? []).map((e) => e.id));
  const myEntryIds = new Set(
    (carspotEntries ?? []).map((e: CarspotEntry) => e.id),
  );

  const game = tally(
    (gameMatches ?? []).map((m) => ({
      a: m.entrant_a,
      b: m.entrant_b,
      winner: m.winner_entrant,
    })),
    myEntrantIds,
  );
  const carspot = tally(
    (carspotMatches ?? []).map((m) => ({
      a: m.entry_a,
      b: m.entry_b,
      winner: m.winner_entry,
    })),
    myEntryIds,
  );
  const wins = game.wins + carspot.wins;
  const losses = game.losses + carspot.losses;

  // ---- signed URLs for the private evidence buckets ----------------------
  const carspotPaths = (carspotEntries ?? []).map((e) => e.storage_path);
  const carspotUrls = new Map<string, string>();
  if (carspotPaths.length) {
    const { data: signed } = await supabase.storage
      .from("carspot-photos")
      .createSignedUrls(carspotPaths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) carspotUrls.set(s.path, s.signedUrl);
    });
  }

  const bingoPaths = (bingoEntries ?? []).map((e) => e.storage_path);
  const bingoUrls = new Map<string, string>();
  if (bingoPaths.length) {
    const { data: signed } = await supabase.storage
      .from("bingo-photos")
      .createSignedUrls(bingoPaths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) bingoUrls.set(s.path, s.signedUrl);
    });
  }

  const carspotUploads = (carspotEntries ?? []).map((e: CarspotEntry) => ({
    id: e.id,
    url: carspotUrls.get(e.storage_path) ?? "",
    caption: e.caption,
    voided: e.voided,
  }));

  const bingoUploads = (bingoEntries ?? []).map((e) => {
    const sq = e.bingo_squares as unknown as { title: string } | null;
    return {
      id: e.id,
      url: bingoUrls.get(e.storage_path) ?? "",
      title: sq?.title ?? "Filed",
    };
  });

  return (
    <main>
      <Masthead
        title="Personnel File"
        formCode="F-12"
        subtitle={isMe ? "Your record, as held by the Bureau." : undefined}
      />
      <ProfileView
        guest={guest}
        isMe={isMe}
        totalPoints={totalPoints}
        awards={(awards ?? []) as PointAward[]}
        wins={wins}
        losses={losses}
        carspotUploads={carspotUploads}
        bingoUploads={bingoUploads}
      />
    </main>
  );
}
