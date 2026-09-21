/**
 * Database shape, kept deliberately compact and hand-maintained.
 * Regenerate the full version any time with:
 *   supabase gen types typescript --project-id zafmrmvqhkxwskktlshs
 */

export type Role = "guest" | "helper" | "host";
export type MatchStatus = "pending" | "live" | "complete";
export type TournamentStatus = "draft" | "live" | "complete";

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
