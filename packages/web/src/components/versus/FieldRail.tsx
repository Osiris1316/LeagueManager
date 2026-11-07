import type { ReactNode } from 'react';
import type { FieldRecord } from '../../api/client';
import { CivMark } from '../head-to-head/CivMark';
import { FormPips } from '../head-to-head/HeadToHead';
import { OnDashLine, Record } from './Record';

/**
 * One player's corner on wide screens: their picker, then their record
 * against everyone in the same game and since date. Mirrored like the
 * head-to-head rows: labels and flags on the outside, results on the inside,
 * every record on one dash line.
 */
export function FieldRail({ side, picker, record, showCivs }: {
  side: 'left' | 'right';
  picker: ReactNode;
  record: FieldRecord | null;
  /** Flags exist for AoE4 only so far. */
  showCivs: boolean;
}) {
  const pct = (won: number, lost: number) => (won + lost === 0 ? '–' : `${Math.round((100 * won) / (won + lost))}%`);
  return (
    <aside className={`vs-rail vs-rail--${side}`}>
      {picker}
      {record && (
        <>
          {record.tier && (
            <p className="vs-rail__meta">
              {record.tier.name} · {record.tier.current ? 'current season' : `S${record.tier.seasonIndex ?? '?'}`}
            </p>
          )}
          <div className="vs-rail__card">
            <h3 className="vs-rail__title">Against everyone</h3>
            <dl className="vs-rail__list">
              <div className="vs-rail__row"><dt>Matches</dt><dd><Record won={record.matches.won} lost={record.matches.lost} /></dd></div>
              <div className="vs-rail__row"><dt>Games</dt><dd><Record won={record.games.won} lost={record.games.lost} /></dd></div>
              <div className="vs-rail__row"><dt>Match win rate</dt><dd><OnDashLine>{pct(record.matches.won, record.matches.lost)}</OnDashLine></dd></div>
              <div className="vs-rail__row"><dt>Last 5</dt><dd><OnDashLine><FormPips form={record.form} side={side} /></OnDashLine></dd></div>
            </dl>
            {showCivs && record.civs.length > 0 && (
              <>
                <h3 className="vs-rail__title">Most played</h3>
                <ol className="vs-rail__list">
                  {record.civs.map((c) => (
                    <li key={c.key} className="vs-rail__row">
                      <CivMark civId={c.key} side={side} flagOnly />
                      <Record won={c.won} lost={c.played - c.won} />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
