import type { ReactNode } from 'react';
import { useStoredFlag } from '../hooks/useStoredFlag';

interface CollapsibleScheduleProps {
  title?: string;
  count?: number;
  /**
   * Remembers whether this section is open, in this browser. Use the same key
   * wherever the "same" section appears (e.g. one per tier), so opening Code S
   * once keeps it open across seasons and both standings layouts.
   */
  storageKey?: string;
  children: ReactNode;
}

export function CollapsibleSchedule({
  title = 'Schedule',
  count,
  storageKey,
  children,
}: CollapsibleScheduleProps) {
  const [open, setOpen] = useStoredFlag(storageKey ? `ui.open.${storageKey}` : null, false);

  return (
    <details
      className="collapsible"
      open={open}
      onToggle={e => setOpen(e.currentTarget.open)}
    >
      <summary className="collapsible__summary">
        <span className="collapsible__chevron" aria-hidden="true" />
        <span className="collapsible__title">{title}</span>
        {count !== undefined && (
          <span className="collapsible__count">{count}</span>
        )}
      </summary>
      <div className="collapsible__body">{children}</div>
    </details>
  );
}
