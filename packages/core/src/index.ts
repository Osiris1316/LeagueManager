export * from './types/league.js';
export { generateRoundRobin } from './league/round-robin.js';
export { computeStandings, seedsFromStandings } from './league/standings.js';
export type { StandingsTiebreak, GroupSeeding } from './league/standings.js';
export * from './league/double-elim.js';
export { computeMatchOutcome } from './league/match-outcome.js';
export type { MatchOutcomeInput, MatchOutcome } from './league/match-outcome.js';

export { CIVS, civById } from './aoe4/civs.js';
export type { Civ } from './aoe4/civs.js';

export * from './stats/slots.js';
export * from './stats/h2h.js';
export * from './stats/rows.js';
export * from './stats/field.js';
export * from './stats/seasons.js';

export { TITLES, titleById, type Title } from './titles/catalog.js';
export {
  seasonLabel,
  seasonLabelShort,
  seasonName,
  seasonNameShort,
  isEventSeason,
  EVENT_FORMAT,
} from './titles/labels.js';
export type { SeasonNaming } from './titles/labels.js';
export {
  ROUND_LENGTH_DAYS,
  groupMatchQueue,
  queueGroupFor,
  roundWindow,
} from './league/match-queue.js';
export type {
  MatchQueue,
  QueueGroup,
  QueueMatch,
  QueueSeason,
  RoundWindow,
} from './league/match-queue.js';
