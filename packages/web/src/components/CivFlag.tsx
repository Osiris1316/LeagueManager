import { civById } from '../data/aoe4';

interface CivFlagProps {
  civId: string | null | undefined;
  showName?: boolean;
  /** Flag height in px; width scales to the flag's aspect. Default 16. */
  height?: number;
}

export function CivFlag({ civId, showName = true, height = 16 }: CivFlagProps) {
  const civ = civById(civId);
  if (!civ) {
    return <span className="civ-flag civ-flag--unknown">{civId ?? '?'}</span>;
  }
  return (
    <span className="civ-flag">
      <img
        className="civ-flag__img"
        src={`/assets/civs/${civ.slug}.png`}
        alt={showName ? '' : civ.name}
        title={showName ? undefined : civ.name}
        height={height}
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      {showName && <span className="civ-flag__name">{civ.name}</span>}
    </span>
  );
}