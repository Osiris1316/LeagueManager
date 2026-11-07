import { useId, useState } from 'react';
import { civById } from '../../data/aoe4';
import type { CivMatchupRecord } from '../../api/client';
import { CivMark } from './CivMark';
import { NamesHeader } from './NamesHeader';
import { gamesCount } from './format';

interface CivMatchupsProps {
  /** The pair's civ-vs-civ records from the left player's side. */
  matchups: CivMatchupRecord[];
  /** Civs each player has used in this title against anyone, most played first. */
  pools: { perspective: string[]; opponent: string[] };
  leftName: string;
  rightName: string;
}

const civName = (id: string) => civById(id)?.name ?? id;

/**
 * Civ against civ for the pair. Both layouts render; CSS shows the matrix
 * when the head-to-head section is wide and the sortable table when it's
 * narrow, so it follows the section's own width (beside the Your Matches
 * panel too), not the window's.
 */
export function CivMatchups({ matchups, pools, leftName, rightName }: CivMatchupsProps) {
  return (
    <div className="h2h-mu">
      <h3 className="h2h__section-title">Civ matchups</h3>
      <Matrix matchups={matchups} pools={pools} leftName={leftName} rightName={rightName} />
      <PhoneTable matchups={matchups} leftName={leftName} rightName={rightName} />
    </div>
  );
}

// ── Wide: the matrix ──

type MatrixMode = 'pair' | 'league';

function Matrix({ matchups, pools, leftName, rightName }: CivMatchupsProps) {
  const [mode, setMode] = useState<MatrixMode>('pair');

  const cells = new Map<string, { won: number; lost: number }>();
  const rowGames = new Map<string, number>();
  const colGames = new Map<string, number>();
  for (const m of matchups) {
    cells.set(`${m.civId}|${m.oppCivId}`, { won: m.won, lost: m.played - m.won });
    rowGames.set(m.civId, (rowGames.get(m.civId) ?? 0) + m.played);
    colGames.set(m.oppCivId, (colGames.get(m.oppCivId) ?? 0) + m.played);
  }

  // Most played first, then by name, so the busiest pairings sit top left.
  const byGames = (games: Map<string, number>) => (a: string, b: string) =>
    (games.get(b) ?? 0) - (games.get(a) ?? 0) || civName(a).localeCompare(civName(b));
  const rows = [...rowGames.keys()].sort(byGames(rowGames));
  const cols = [...colGames.keys()].sort(byGames(colGames));
  const extraRows = new Set<string>();
  const extraCols = new Set<string>();
  if (mode === 'league') {
    for (const id of pools.perspective) if (!rowGames.has(id)) { rows.push(id); extraRows.add(id); }
    for (const id of pools.opponent) if (!colGames.has(id)) { cols.push(id); extraCols.add(id); }
  }

  const record = (won: number, lost: number) => `${won}–${lost}`;
  const colTotals = cols.map((c) => {
    let won = 0;
    let lost = 0;
    for (const r of rows) {
      const cell = cells.get(`${r}|${c}`);
      if (cell) { won += cell.won; lost += cell.lost; }
    }
    return { won, lost };
  });
  const totalWon = colTotals.reduce((n, t) => n + t.won, 0);
  const totalLost = colTotals.reduce((n, t) => n + t.lost, 0);
  const totalGames = totalWon + totalLost;

  return (
    <div className="h2h-mu__matrix">
      <p className="h2h-mu__note">
        {leftName}’s civs down the side, {rightName}’s across the top. Each cell is {leftName}’s game record in that pairing.
      </p>

      <div className="h2h-mx-controls">
        <div className="view-switch" role="group" aria-label="Which civs get a row or column">
          <button type="button" aria-pressed={mode === 'pair'} onClick={() => setMode('pair')}
            className={`view-switch__btn${mode === 'pair' ? ' view-switch__btn--active' : ''}`}>
            Played against each other
          </button>
          <button type="button" aria-pressed={mode === 'league'} onClick={() => setMode('league')}
            className={`view-switch__btn${mode === 'league' ? ' view-switch__btn--active' : ''}`}>
            Everything each has played
          </button>
        </div>
        <span className="h2h-mu__note h2h-mu__note--inline">
          {mode === 'pair'
            ? `${rows.length} × ${cols.length}, from the ${gamesCount(totalGames)} they have played each other`
            : 'Adds civs each has played against anyone else, faded, so open pairings show up'}
        </span>
      </div>

      <div className="h2h-mx-card">
        <table className="h2h-mx">
          <caption className="sr-only">
            {leftName}’s game record with each civ against each of {rightName}’s civs
          </caption>
          <thead>
            <tr>
              <th scope="col" className="h2h-mx__corner">{leftName} ↓ · {rightName} →</th>
              {cols.map((c) => (
                <th key={c} scope="col" className={`h2h-mx__col${extraCols.has(c) ? ' h2h-mx__extra' : ''}`}>
                  <CivMark civId={c} side="right" flagOnly />
                </th>
              ))}
              <th scope="col" className="h2h-mx__col h2h-mx__total-head">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              let won = 0;
              let lost = 0;
              return (
                <tr key={r}>
                  <th scope="row" className={`h2h-mx__row${extraRows.has(r) ? ' h2h-mx__extra' : ''}`}>
                    <CivMark civId={r} side="left" flagOnly />
                  </th>
                  {cols.map((c) => {
                    const cell = cells.get(`${r}|${c}`);
                    if (cell) { won += cell.won; lost += cell.lost; }
                    const tone = !cell ? 'none'
                      : cell.won > cell.lost ? 'lead'
                      : cell.won < cell.lost ? 'trail'
                      : 'even';
                    return (
                      <td key={c} className={`h2h-mx__cell h2h-mx__cell--${tone}`}
                        title={`${civName(r)} vs ${civName(c)}: ${cell ? `${leftName} ${record(cell.won, cell.lost)}` : 'never played'}`}>
                        {cell ? record(cell.won, cell.lost) : '–'}
                      </td>
                    );
                  })}
                  <td className="h2h-mx__total">{won + lost > 0 ? record(won, lost) : '–'}</td>
                </tr>
              );
            })}
            <tr className="h2h-mx__totals">
              <th scope="row" className="h2h-mx__row h2h-mx__total-head">Total</th>
              {colTotals.map((t, i) => (
                <td key={cols[i]} className="h2h-mx__total">{t.won + t.lost > 0 ? record(t.won, t.lost) : '–'}</td>
              ))}
              <td className="h2h-mx__total h2h-mx__grand">{record(totalWon, totalLost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="h2h-legend" aria-hidden="true">
        <span className="h2h-legend__item"><span className="h2h-legend__swatch h2h-mx__cell--lead" />{leftName} ahead</span>
        <span className="h2h-legend__item"><span className="h2h-legend__swatch h2h-mx__cell--trail" />{rightName} ahead</span>
        <span className="h2h-legend__item"><span className="h2h-legend__swatch h2h-mx__cell--even" />Even</span>
        <span className="h2h-legend__item"><span className="h2h-legend__swatch h2h-mx__cell--none" />– never met in this pairing</span>
      </div>
    </div>
  );
}

// ── Narrow: one row per pairing they've played, on the shared grid ──

type SortKey = 'played' | 'winrate';

function PhoneTable({ matchups, leftName, rightName }: Omit<CivMatchupsProps, 'pools'>) {
  const [sort, setSort] = useState<SortKey>('played');
  const selectId = useId();

  const byName = (a: CivMatchupRecord, b: CivMatchupRecord) =>
    (civName(a.civId) + civName(a.oppCivId)).localeCompare(civName(b.civId) + civName(b.oppCivId));
  const rows = [...matchups].sort(sort === 'winrate'
    ? (a, b) => b.winRate - a.winRate || b.played - a.played || byName(a, b)
    : (a, b) => b.played - a.played || b.winRate - a.winRate || byName(a, b));
  const totalGames = matchups.reduce((n, m) => n + m.played, 0);

  return (
    <div className="h2h-mu__table">
      <p className="h2h-mu__note">
        Every civ pairing {leftName} and {rightName} have played, with each side’s wins.
      </p>

      <div className="h2h-mu__sort">
        <label htmlFor={selectId} className="h2h-mu__sort-label">Sort by</label>
        <select id={selectId} className="stats-scope-picker__select h2h-mu__select"
          value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="played">Most played</option>
          <option value="winrate">{leftName} win rate</option>
        </select>
      </div>

      <NamesHeader leftName={leftName} rightName={rightName}
        centre={sort === 'winrate' ? `${leftName} win share` : 'Games'} centreActive />
      <ol className="h2h-list">
        {rows.map((m) => {
          const lost = m.played - m.won;
          const share = Math.round(m.winRate * 100);
          return (
            <li key={`${m.civId}|${m.oppCivId}`} className="h2h-grid h2h-row">
              <span className="h2h-a"><CivMark civId={m.civId} side="left" flagOnly /></span>
              <span className={`h2h-b h2h-score ${m.won > lost ? 'h2h-lead' : 'h2h-trail'}`}>
                <span className="sr-only">{leftName} </span>{m.won}
              </span>
              <span className="h2h-split">
                <span className="h2h-split__label">{gamesCount(m.played)}</span>
                <span className="h2h-bar" aria-hidden="true">
                  <span className="h2h-bar__fill" style={{ '--h2h-share': `${share}%` } as React.CSSProperties} />
                </span>
              </span>
              <span className={`h2h-d h2h-score ${lost > m.won ? 'h2h-lead' : 'h2h-trail'}`}>
                <span className="sr-only">{rightName} </span>{lost}
              </span>
              <span className="h2h-e"><CivMark civId={m.oppCivId} side="right" flagOnly /></span>
            </li>
          );
        })}
      </ol>
      <p className="h2h-mu__foot">
        {rows.length} {rows.length === 1 ? 'pairing' : 'pairings'} from {gamesCount(totalGames)}. The bar is {leftName}’s share of the wins.
        Pairings they have never played are left out here; the desktop grid shows them as dashes.
      </p>
    </div>
  );
}
