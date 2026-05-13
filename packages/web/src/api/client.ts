const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Types ──

export interface Season {
  id: number;
  season_number: number;
  status: string;
  best_of: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface Tier {
  id: string;
  display_name: string;
  sort_order: number;
  civ_rule: string;
  rules_summary: string | null;
}

export interface PlayerStanding {
  player_id: number;
  display_name: string;
  wins: number;
  losses: number;
  match_wins: number;
  match_losses: number;
  game_diff: number;
  rank: number;
}

export interface MatchWithPlayers {
  id: number;
  season_id: number;
  tier_id: string;
  player1_id: number;
  player2_id: number;
  best_of: number;
  status: string;
  winner_id: number | null;
  player1_score: number;
  player2_score: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  round_number: number | null;
  player1_name: string;
  player2_name: string;
  winner_name: string | null;
}

export interface Preset {
  draft_type: string;
  preset_id: string | null;
  preset_url: string | null;
  label: string | null;
}

export interface TierData {
  tier: Tier;
  standings: PlayerStanding[];
  matches: MatchWithPlayers[];
  rounds: Record<string, MatchWithPlayers[]>;
  rules_summary: string | null;
}

export interface StandingsResponse {
  season: Season;
  tiers: TierData[];
}

export interface Player {
  id: number;
  display_name: string;
  discord_id: string | null;
  aoe4world_id: string | null;
  created_at: string;
  active: number;
}

export interface PlayerDetailResponse {
  player: Player;
  tierAssignment: {
    tier_id: string;
    tier_name: string;
    civ_rule: string;
    season_number: number;
  } | null;
  matches: (MatchWithPlayers & { season_number: number })[];
}

// ── Public API functions ──

export function getSeasons(): Promise<Season[]> {
  return fetchJson('/api/seasons');
}

export function getStandings(seasonId: number): Promise<StandingsResponse> {
  return fetchJson(`/api/standings/${seasonId}`);
}

export function getPlayer(playerId: number): Promise<PlayerDetailResponse> {
  return fetchJson(`/api/players/${playerId}`);
}

export function getPlayers(): Promise<Player[]> {
  return fetchJson('/api/players');
}

export function getMatch(matchId: number): Promise<{
  match: MatchWithPlayers & { tier_name: string; civ_rule: string };
  games: unknown[];
  rules_summary: string | null;
  presets: Preset[];
}> {
  return fetchJson(`/api/matches/${matchId}`);
}

export function getRules(seasonId: number, tierId: string): Promise<{
  rules_summary: string | null;
  rules_full: string | null;
}> {
  return fetchJson(`/api/seasons/${seasonId}/tiers/${tierId}/rules`);
}

// ── Admin auth ──

export function setAdminToken(token: string) {
  sessionStorage.setItem('admin_token', token);
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem('admin_token');
}

export function clearAdminToken() {
  sessionStorage.removeItem('admin_token');
}

// ── Admin API functions ──

export interface GameReport {
  game_number: number;
  map_name?: string;
  map_id?: string;
  player1_civ?: string;
  player1_civ_id?: string;
  player2_civ?: string;
  player2_civ_id?: string;
  winner_id: number;
}

export interface MatchReportResponse {
  match: MatchWithPlayers;
  games: unknown[];
  message: string;
}

async function adminFetch(path: string, body?: unknown): Promise<Response> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: body !== undefined ? JSON.stringify(body) : '{}',
  });

  if (res.status === 401) throw new Error('Invalid admin token');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((err as { error: string }).error ?? 'Request failed');
  }

  return res;
}

export async function reportMatch(matchId: number, games: GameReport[]): Promise<MatchReportResponse> {
  const res = await adminFetch(`/api/admin/matches/${matchId}/report`, { games });
  return res.json() as Promise<MatchReportResponse>;
}

export async function clearMatch(matchId: number): Promise<{ message: string }> {
  const res = await adminFetch(`/api/admin/matches/${matchId}/clear`);
  return res.json() as Promise<{ message: string }>;
}