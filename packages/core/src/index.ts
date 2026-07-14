export * from './types/league.js';
export { generateRoundRobin } from './league/round-robin.js';
export { computeStandings } from './league/standings.js';
export { computeMatchOutcome } from './league/match-outcome.js';
export type { MatchOutcomeInput, MatchOutcome } from './league/match-outcome.js';

export { CIVS, civById } from './aoe4/civs.js';
export type { Civ } from './aoe4/civs.js';

export * from './stats/slots.js';
export * from './stats/h2h.js';
export * from './stats/rows.js';