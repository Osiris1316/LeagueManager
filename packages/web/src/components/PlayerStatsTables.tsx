import type { ReactNode } from 'react';
import type { KeyedRecord, PlayerStatsResponse } from '../api/client';
import { MAPS } from '../data/aoe4';
import { CivFlag } from './CivFlag';

interface PlayerStatsTablesProps {
  stats: PlayerStatsResponse;
}

interface StatsTableProps {
  title: string;
  /** Column heading for the first column, e.g. "Civ" or "Map". */
  pickLabel: string;
  rows: KeyedRecord[];
  emptyText: string;
  renderLabel: (key: string) => ReactNode;
}

function formatWinRate(winRate: number) {
  if (!Number.isFinite(winRate)) return '—';
  return `${Math.round(winRate * 100)}%`;
}

function formatRecord(row: KeyedRecord) {
  return `${row.won}–${row.played - row.won}`;
}

function sortRowsByPlayed(rows: KeyedRecord[]) {
  return [...rows].sort((a, b) => {
    if (b.played !== a.played) return b.played - a.played;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return a.key.localeCompare(b.key);
  });
}

function formatMapName(key: string) {
  const knownMap = MAPS.find((map) => map.id === key);
  if (knownMap) return knownMap.name;

  return key
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (part.toLowerCase() === 'egc') return 'EGC';
      return part[0]!.toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function StatsTable({ title, pickLabel, rows, emptyText, renderLabel }: StatsTableProps) {
  const sortedRows = sortRowsByPlayed(rows);

  return (
    <article className="card player-stats-card">
      <header className="player-stats-card__header">
        <h3>{title}</h3>
      </header>

      {sortedRows.length === 0 ? (
        <p className="player-stats-card__empty">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="player-stats-table">
            <thead>
              <tr>
                <th scope="col">{pickLabel}</th>
                <th scope="col" className="num"><abbr title="Played">P</abbr></th>
                <th scope="col" className="num"><abbr title="Wins and losses">W–L</abbr></th>
                <th scope="col" className="num"><abbr title="Win rate">Win</abbr></th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.key}>
                  <td data-label="Pick" className="player-stats-table__label">
                    {renderLabel(row.key)}
                  </td>
                  <td data-label="Played" className="num">{row.played}</td>
                  <td data-label="Record" className="num">{formatRecord(row)}</td>
                  <td data-label="Win Rate" className="num">{formatWinRate(row.winRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export function PlayerStatsTables({ stats }: PlayerStatsTablesProps) {
  return (
    <div className="player-stats-grid">
      <StatsTable
        title="Civilizations"
        pickLabel="Civ"
        rows={stats.civs}
        emptyText="No civilization stats yet."
        renderLabel={(key) => <CivFlag civId={key} showName />}
      />

      <StatsTable
        title="Maps"
        pickLabel="Map"
        rows={stats.maps}
        emptyText="No map stats yet."
        renderLabel={(key) => <span>{formatMapName(key)}</span>}
      />
    </div>
  );
}