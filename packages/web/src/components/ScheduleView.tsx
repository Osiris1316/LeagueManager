import type { MatchWithPlayers } from '../api/client';
import { MatchCard } from './MatchCard';

interface ScheduleViewProps {
  matches: MatchWithPlayers[];
  rounds: Record<string, MatchWithPlayers[]>;
  seasonStartDate?: string | null;
  tierAccent?: 's' | 'a' | 'b';
}

function formatDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}.${m}.${d}`;
}

function getRoundDateRange(
  roundNumber: number,
  seasonStart: string | null | undefined
): string | null {
  if (!seasonStart) return null;

  const start = new Date(seasonStart + 'T00:00:00');
  if (isNaN(start.getTime())) return null;

  const roundStart = new Date(start);
  roundStart.setDate(roundStart.getDate() + (roundNumber - 1) * 7);

  const roundEnd = new Date(roundStart);
  roundEnd.setDate(roundEnd.getDate() + 6);

  return `${formatDate(roundStart)} – ${formatDate(roundEnd)}`;
}

export function ScheduleView({ matches, rounds, seasonStartDate, tierAccent }: ScheduleViewProps) {
  if (matches.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>No matches scheduled.</p>;
  }

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  // Split each round's matches into pending vs completed, preserving round order.
  const pendingByRound: { round: number; matches: MatchWithPlayers[] }[] = [];
  const completedByRound: { round: number; matches: MatchWithPlayers[] }[] = [];

  for (const rn of roundNumbers) {
    const roundMatches = rounds[String(rn)] ?? [];
    const pending = roundMatches.filter(m => m.status !== 'complete');
    const completed = roundMatches.filter(m => m.status === 'complete');
    if (pending.length > 0) pendingByRound.push({ round: rn, matches: pending });
    if (completed.length > 0) completedByRound.push({ round: rn, matches: completed });
  }

  function renderRounds(groups: { round: number; matches: MatchWithPlayers[] }[]) {
    return groups.map(({ round, matches: roundMatches }) => {
      const dateRange = getRoundDateRange(round, seasonStartDate);
      return (
        <div key={round} role="listitem">
          <div className="round-header">
            Round {round}
            {dateRange && <span className="round-header__date">{dateRange}</span>}
          </div>
          <div className="match-list">
            {roundMatches.map(match => (
              <MatchCard key={match.id} match={match} tierAccent={tierAccent} />
            ))}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="schedule-view" role="list" aria-label="Match schedule by status and round">
      {pendingByRound.length > 0 && (
        <div className="schedule-section">
          <h4 className="schedule-section__label">Upcoming</h4>
          {renderRounds(pendingByRound)}
        </div>
      )}

      {completedByRound.length > 0 && (
        <div className="schedule-section">
          <h4 className="schedule-section__label">Completed</h4>
          {renderRounds(completedByRound)}
        </div>
      )}
    </div>
  );
}