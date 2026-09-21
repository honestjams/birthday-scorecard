/**
 * Database shape, kept deliberately compact and hand-maintained.
 * Regenerate the full version any time with:
 *   supabase gen types typescript --project-id zafmrmvqhkxwskktlshs
 */

export type Role = "guest" | "helper" | "host";
export type MatchStatus = "pending" | "live" | "complete";
export type TournamentStatus = "draft" | "live" | "complete";
export type CarspotStatus = "draft" | "live" | "complete";
export type ScoringCategory =
  | "carspotting"
  | "karting"
  | "tournament"
  | "bingo";

export type Guest = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

/** Only ever returned by the staff_guest_list() RPC. */
export type StaffGuest = Guest & { phone: string };

export type AppSettings = {
  id: boolean;
  party_name: string;
  party_date: string | null;
  invite_only: boolean;
  bingo_open: boolean;
  kart_open: boolean;
  tournament_open: boolean;
  carspot_open: boolean;
  carspot_status: CarspotStatus;
  carspot_rounds: number;
  updated_at: string;
};

export type BingoSquare = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type BingoEntry = {
  id: string;
  guest_id: string;
  square_id: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  created_at: string;
};

export type KartTime = {
  id: string;
  guest_id: string;
  time_ms: number;
  session_label: string | null;
  note: string | null;
  verified: boolean;
  created_at: string;
};

export type LeaderboardRow = {
  guest_id: string;
  display_name: string;
  avatar_url: string | null;
  time_id: string;
  time_ms: number;
  verified: boolean;
  created_at: string;
};

export type Tournament = {
  id: string;
  name: string;
  game: string | null;
  status: TournamentStatus;
  rounds: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentEntrant = {
  id: string;
  tournament_id: string;
  guest_id: string;
  seed: number | null;
  eliminated_at: string | null;
};

export type Match = {
  id: string;
  tournament_id: string;
  round: number;
  slot: number;
  entrant_a: string | null;
  entrant_b: string | null;
  winner_entrant: string | null;
  score_a: number | null;
  score_b: number | null;
  status: MatchStatus;
  updated_at: string;
};

/* ---- carspotting ---- */

export type CarspotEntry = {
  id: string;
  guest_id: string;
  storage_path: string;
  caption: string | null;
  location: string | null;
  voided: boolean;
  void_reason: string | null;
  created_at: string;
};

export type CarspotMatch = {
  id: string;
  round: number;
  slot: number;
  entry_a: string | null;
  entry_b: string | null;
  winner_entry: string | null;
  is_bronze: boolean;
  status: MatchStatus;
  updated_at: string;
};

/* ---- points & standings ---- */

export type ScoringConfig = {
  category: ScoringCategory;
  place: number;
  points: number;
};

export type PointAward = {
  id: string;
  guest_id: string;
  category: string;
  place: number | null;
  label: string;
  points: number;
  source: "auto" | "manual";
  created_by: string | null;
  created_at: string;
};

export type StandingsRow = {
  guest_id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  award_count: number;
};
