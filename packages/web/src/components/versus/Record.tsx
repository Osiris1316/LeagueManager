/**
 * A won–lost record as three columns: wins right-aligned to the dash,
 * losses left-aligned from it, in a box of fixed width. Every record in a
 * panel uses the same box, so the dashes form one straight vertical line
 * and the digits line up above and below each other.
 */
export function Record({ won, lost, className = '' }: { won: number; lost: number; className?: string }) {
  return (
    <span className={`vs-rec ${className}`}>
      <span className="vs-rec__w">{won}</span>
      <span className="vs-rec__dash">–</span>
      <span className="vs-rec__l">{lost}</span>
    </span>
  );
}

/** Something that isn't a record (a percentage, the last five), centred on the dash line. */
export function OnDashLine({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`vs-rec vs-rec--whole ${className}`}>{children}</span>;
}
