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

  return (
    <div role="list" aria-label="Match schedule by round">
      {roundNumbers.map(rn => {
        const roundMatches = rounds[String(rn)] ?? [];
        const dateRange = getRoundDateRange(rn, seasonStartDate);

        return (
          <div key={rn} role="listitem">
            <div className="round-header">
              Round {rn}
              {dateRange && (
                <span className="round-header__date">{dateRange}</span>
              )}
            </div>
            <div className="match-list">
              {roundMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  tierAccent={tierAccent}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}