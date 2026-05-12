// ── Domain types for LeagueManager ──

export interface Player {
  id: number;
  display_name: string;
  discord_id: string | null;
  aoe4world_id: string | null;
  created_at: string;
  active: number; // SQLite boolean: 0 | 1
}

export type TierId = 'code_s' | 'code_a' | 'code_b';
export type CivRule = 'pro_draft' | 'win_lock' | 'unrestricted';
export type SeasonStatus = 'pending' | 'active' | 'complete';
export type MatchStatus = 'pending' | 'scheduled' | 'in_progress' | 'complete';

export interface Tier {
  id: TierId;
  display_name: string;
  sort_order: number;
  civ_rule: CivRule;
  rules_summary: string | null;
}

export interface Season {
  id: number;
  season_number: number;
  status: SeasonStatus;
  best_of: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface TierAssignment {
  id: number;
  season_id: number;
  player_id: number;
  tier_id: TierId;
  final_rank: number | null;
  promoted: number;
  relegated: number;
}

export interface Match {
  id: number;
  season_id: number;
  tier_id: TierId;
  player1_id: number;
  player2_id: number;
  best_of: number;
  status: MatchStatus;
  winner_id: number | null;
  player1_score: number;
  player2_score: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  map_draft_id: string | null;
  civ_draft_id: string | null;
  round_number: number | null;
}

export interface Game {
  id: number;
  match_id: number;
  game_number: number;
  map_name: string | null;
  map_id: string | null;
  player1_civ: string | null;
  player1_civ_id: string | null;
  player2_civ: string | null;
  player2_civ_id: string | null;
  winner_id: number | null;
  played_at: string | null;
  aoe4world_game_id: string | null;
  notes: string | null;
}

export interface MatchCivHistory {
  id: number;
  match_id: number;
  player_id: number;
  civ_id: string;
  game_number: number;
  won: number;
}

export interface SeasonTransition {
  id: number;
  from_season_id: number;
  to_season_id: number;
  player_id: number;
  from_tier_id: TierId;
  to_tier_id: TierId;
  transition_type: 'promotion' | 'relegation' | 'static';
  created_at: string;
}

// ── Computed / view types (not 1:1 with tables) ──

export interface PlayerStanding {
  player_id: number;
  display_name: string;
  wins: number;
  losses: number;
  match_wins: number;   // games won across all matches
  match_losses: number; // games lost across all matches
  game_diff: number;    // match_wins - match_losses (tiebreaker)
  rank: number;
}

export interface MatchWithPlayers extends Match {
  player1_name: string;
  player2_name: string;
  winner_name: string | null;
}

export interface TierStandings {
  tier: Tier;
  standings: PlayerStanding[];
}

export interface RoundPairing {
  player1_id: number;
  player2_id: number;
}

export interface Round {
  round_number: number;
  pairings: RoundPairing[];
  bye_player_id?: number; // for odd-count tiers
}
