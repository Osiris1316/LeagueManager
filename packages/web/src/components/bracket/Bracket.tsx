import { useState } from 'react';
import { Link } from 'react-router-dom';
import { syncBracket } from '../../api/client';
import type { Bracket as BracketData, BracketEntrant, BracketSlot } from '../../api/client';

/**
 * A double elimination bracket in three blocks: upper, lower, grand final.
 * Every slot always has its place (a bye is drawn as a quiet box), so the
 * layout and the connecting lines are fixed and live entirely in CSS: each
 * slot id maps to a grid position, and a slot either feeds the next column
 * (line out to the right) or receives from the previous one (a straight line
 * in, or a bracket joining two feeders).
 *
 * Wide blocks scroll sideways on phones.
 */

interface Column { heading: string; slots: string[] }

const SECTIONS: { id: BracketSlot['section']; title: string; columns: Column[] }[] = [
  {
    id: 'upper',
    title: 'Upper bracket',
    columns: [
      { heading: 'Quarterfinals', slots: ['UB-QF1', 'UB-QF2', 'UB-QF3', 'UB-QF4'] },
      { heading: 'Semifinals', slots: ['UB-SF1', 'UB-SF2'] },
      { heading: 'Final', slots: ['UB-F'] },
    ],
  },
  {
    id: 'lower',
    title: 'Lower bracket',
    columns: [
      { heading: 'Round 1', slots: ['LB-R1-1', 'LB-R1-2'] },
      { heading: 'Round 2', slots: ['LB-R2-1', 'LB-R2-2'] },
      { heading: 'Semifinal', slots: ['LB-SF'] },
      { heading: 'Final', slots: ['LB-F'] },
    ],
  },
  {
    id: 'final',
    title: 'Grand final',
    columns: [
      { heading: 'Grand final', slots: ['GF'] },
      { heading: 'Reset, if needed', slots: ['GF-RESET'] },
    ],
  },
];

/** Slots whose winner carries on to the next column in the same block. */
const FEEDS = new Set(['UB-QF1', 'UB-QF2', 'UB-QF3', 'UB-QF4', 'UB-SF1', 'UB-SF2',
  'LB-R1-1', 'LB-R1-2', 'LB-R2-1', 'LB-R2-2', 'LB-SF', 'GF']);

/** How a slot receives from the previous column: one line, or a bracket joining two. */
const JOIN: Record<string, 'straight' | 'pair' | 'pair-wide'> = {
  'UB-SF1': 'pair', 'UB-SF2': 'pair', 'UB-F': 'pair-wide',
  'LB-R2-1': 'straight', 'LB-R2-2': 'straight', 'LB-SF': 'pair', 'LB-F': 'straight',
  'GF-RESET': 'straight',
};

function Entrant({ entrant, slot, side }: { entrant: BracketEntrant; slot: BracketSlot; side: 'a' | 'b' }) {
  const decided = slot.status === 'complete' || slot.status === 'bye';
  const won = decided && entrant.player_id !== null && entrant.player_id === slot.winner_id;
  const lost = slot.status === 'complete' && entrant.player_id !== null && !won;

  let name: string;
  let mod = '';
  if (entrant.state === 'player') {
    name = entrant.name ?? '';
  } else if (entrant.state === 'bye') {
    name = 'Bye';
    mod = ' bracket-entrant--bye';
  } else {
    name = entrant.source;
    mod = ' bracket-entrant--tbd';
  }

  return (
    <span
      className={`bracket-entrant bracket-entrant--${side}${mod}` +
        `${won ? ' bracket-entrant--won' : ''}${lost ? ' bracket-entrant--lost' : ''}`}
    >
      <span className="bracket-entrant__seed">{entrant.seed ?? ''}</span>
      <span className="bracket-entrant__name">{name}</span>
      <span className="bracket-entrant__score">
        {slot.status === 'complete' && entrant.score !== null ? entrant.score : ''}
      </span>
    </span>
  );
}

function spokenSide(e: BracketEntrant): string {
  if (e.state === 'player') return e.name ?? 'a player';
  if (e.state === 'bye') return 'a bye';
  return e.source.toLowerCase();
}

function SlotBox({ slot }: { slot: BracketSlot }) {
  const feeds = FEEDS.has(slot.id) ? ' bracket-match--feeds' : '';
  const className = `bracket-match bracket-match--${slot.status}${feeds}${slot.stale ? ' bracket-match--stale' : ''}`;
  const body = (
    <>
      <Entrant entrant={slot.a} slot={slot} side="a" />
      <Entrant entrant={slot.b} slot={slot} side="b" />
    </>
  );
  const winner = slot.winner_id === slot.a.player_id ? slot.a : slot.winner_id === slot.b.player_id ? slot.b : null;
  const spoken = `${slot.label}: ${spokenSide(slot.a)} versus ${spokenSide(slot.b)}` +
    (slot.status === 'complete' && winner ? `, won by ${winner.name}` : '') +
    (slot.status === 'skipped' ? ', not played' : '');

  return (
    <div className={`bracket-cell bracket-cell--${slot.id.toLowerCase()}${JOIN[slot.id] ? ` bracket-cell--join-${JOIN[slot.id]}` : ''}`}>
      {slot.match_id ? (
        <Link to={`/match/${slot.match_id}`} className={className} aria-label={`${spoken}. Open match page.`}>
          {body}
        </Link>
      ) : (
        <div className={className} aria-label={spoken} role="group">
          {body}
        </div>
      )}
    </div>
  );
}

function seedingNote(bracket: BracketData): string | null {
  const { state, tied_ranks } = bracket.seeding;
  if (state === 'pending') {
    return 'Seeded from the final group standings, ties broken by head to head. The bracket fills in when the last group match is reported.';
  }
  if (state === 'ready') return 'Group stage finished. Seeds are locked in when the bracket next updates.';
  if (state === 'tie') {
    const ranks = tied_ranks.map((r) => `${r}`).join(', ');
    return `Group stage finished with a tie head to head can't break (rank ${ranks}). An admin sets the seeds by hand.`;
  }
  if (state === 'invalid') return 'Seeds are incomplete. An admin needs to set every seed.';
  return null;
}

interface BracketProps {
  bracket: BracketData;
  seasonId: number;
  isAdmin: boolean;
  /** Called after an admin update so the page reloads the bracket. */
  onUpdated: () => void;
}

export function Bracket({ bracket, seasonId, isAdmin, onUpdated }: BracketProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bySlot = new Map(bracket.slots.map((s) => [s.id, s]));
  const champion = bracket.champion_id !== null
    ? bracket.slots.flatMap((s) => [s.a, s.b]).find((e) => e.player_id === bracket.champion_id)?.name ?? null
    : null;
  const note = seedingNote(bracket);
  const stale = bracket.slots.filter((s) => s.stale);

  async function update() {
    setBusy(true);
    setError(null);
    try {
      await syncBracket(seasonId);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bracket" aria-labelledby="bracket-heading">
      <div className="section-header bracket__head">
        <h2 id="bracket-heading">Playoffs</h2>
        <span className="bracket__meta">Double elimination</span>
        {champion && <span className="bracket__champion">Champion: {champion}</span>}
        {isAdmin && (
          <button type="button" className="match-links__btn bracket__update" onClick={update} disabled={busy}>
            {busy ? 'Updating…' : 'Update bracket'}
          </button>
        )}
      </div>

      {note && <p className="bracket__note">{note}</p>}
      {error && <div role="alert" className="banner banner--error">{error}</div>}
      {isAdmin && stale.length > 0 && (
        <div role="alert" className="banner banner--error">
          {stale.map((s) => s.label).join(', ')}: played before an earlier result changed. Clear it, or
          restore the earlier result.
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.id} className={`bracket__block bracket__block--${section.id}`}>
          <h3 className="bracket__block-title">{section.title}</h3>
          <div className="bracket__scroll">
            <div className={`bracket__grid bracket__grid--${section.id}`}>
              {section.columns.map((col, i) => (
                <span key={col.heading} className={`bracket__col-head bracket__col-head--${i + 1}`}>
                  {col.heading}
                </span>
              ))}
              {section.columns.flatMap((col) => col.slots).map((id) => {
                const slot = bySlot.get(id);
                return slot ? <SlotBox key={id} slot={slot} /> : null;
              })}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
