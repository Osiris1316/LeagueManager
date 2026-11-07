import { civById } from '../../data/aoe4';

interface CivMarkProps {
  civId: string | null;
  /**
   * Which half of the mirrored grid this sits in. The short name goes on the
   * outside of the flag, so the flags sit next to the results in the middle.
   */
  side: 'left' | 'right';
  /** Winner of this game: the name gets weight. */
  won?: boolean;
  /** Flag only, never the short name (the civ matrix). */
  flagOnly?: boolean;
}

/**
 * A civ as a flag, plus its short name where the layout has room for it
 * (CSS shows `.h2h-civname` only in a wide head-to-head container). The flag's
 * alt and title carry the full name, so screen readers always hear the full
 * name and a mouse hover shows it; the visible short name is hidden from
 * screen readers to avoid reading the civ twice.
 */
export function CivMark({ civId, side, won = false, flagOnly = false }: CivMarkProps) {
  const civ = civById(civId);

  const flag = civ ? (
    <img
      className="h2h-flag"
      src={`/assets/civs/${civ.slug}.png`}
      alt={civ.name}
      title={civ.name}
      loading="lazy"
    />
  ) : (
    <span className="h2h-flag h2h-flag--unknown" role="img" aria-label="Civ not recorded" title="Civ not recorded">?</span>
  );

  if (flagOnly || !civ) return <span className="h2h-civ">{flag}</span>;

  const name = (
    <span className={`h2h-civname ${won ? 'h2h-lead' : 'h2h-trail'}`} aria-hidden="true">
      {civ.short}
    </span>
  );

  return (
    <span className="h2h-civ">
      {side === 'left' ? <>{name}{flag}</> : <>{flag}{name}</>}
    </span>
  );
}
