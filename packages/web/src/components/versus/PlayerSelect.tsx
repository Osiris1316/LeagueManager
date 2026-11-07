import type { Player } from '../../api/client';

/**
 * Versus page: one side's player picker. Mirrored: the name sits
 * on the inside, next to the centre, and the chevron on the outside.
 */
export function PlayerSelect({ id, side, players, value, exclude, onChange }: {
  id: string;
  side: 'left' | 'right';
  players: Player[];
  value: number | null;
  /** The other side's player, who can't be picked twice. */
  exclude: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>{side === 'left' ? 'First player' : 'Second player'}</label>
      <select
        id={id}
        className={`vs-pick vs-pick--${side}${value == null ? ' vs-pick--empty' : ''}`}
        value={value ?? ''}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(next)) onChange(next);
        }}
      >
        {value == null && <option value="">Pick a player</option>}
        {players.map((p) => (
          <option key={p.id} value={p.id} disabled={p.id === exclude}>{p.display_name}</option>
        ))}
      </select>
    </>
  );
}

/** Swap sides: the left player is the one every number is from. */
export function SwapButton({ onSwap, className = '' }: { onSwap: () => void; className?: string }) {
  return (
    <button type="button" className={`vs-swap ${className}`} onClick={onSwap} aria-label="Swap sides" title="Swap sides">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="17 3 21 7 17 11" />
        <line x1="21" y1="7" x2="9" y2="7" />
        <polyline points="7 13 3 17 7 21" />
        <line x1="3" y1="17" x2="15" y2="17" />
      </svg>
    </button>
  );
}
