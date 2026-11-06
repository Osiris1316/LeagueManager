import { useEffect, useState } from 'react';
import { getPlayers } from '../../api/client';
import type { Player } from '../../api/client';

interface PlayerPickerProps {
  selectedId: number | null;
  onPick: (playerId: number) => void;
}

/** A compact list of active players to follow, for the panel and sheet. */
export function PlayerPicker({ selectedId, onPick }: PlayerPickerProps) {
  const [players, setPlayers] = useState<Player[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlayers()
      .then(list => {
        if (cancelled) return;
        setPlayers(
          list
            .filter(p => p.active)
            .sort((a, b) => a.display_name.localeCompare(b.display_name)),
        );
      })
      .catch(() => { if (!cancelled) setPlayers([]); });
    return () => { cancelled = true; };
  }, []);

  if (players === null) return <p className="ym-note">Loading players…</p>;
  if (players.length === 0) return <p className="ym-note">Couldn't load the player list.</p>;

  return (
    <ul className="ym-picker" role="list">
      {players.map(p => (
        <li key={p.id}>
          <button
            type="button"
            className={`ym-picker__btn${p.id === selectedId ? ' ym-picker__btn--selected' : ''}`}
            aria-pressed={p.id === selectedId}
            onClick={() => onPick(p.id)}
          >
            {p.display_name}
          </button>
        </li>
      ))}
    </ul>
  );
}
