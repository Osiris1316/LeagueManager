/** Column header row: each name centred over its own results, an optional centre label. */
export function NamesHeader({ leftName, rightName, centre, centreActive = false }: {
  leftName: string;
  rightName: string;
  centre?: string;
  centreActive?: boolean;
}) {
  return (
    <div className="h2h-grid h2h-colhead" aria-hidden="true">
      <span className="h2h-b h2h-name">{leftName}</span>
      {centre && <span className={`h2h-c${centreActive ? ' h2h-colhead--active' : ''}`}>{centre}</span>}
      <span className="h2h-d h2h-name">{rightName}</span>
    </div>
  );
}
