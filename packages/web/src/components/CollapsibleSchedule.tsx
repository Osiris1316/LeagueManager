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
  /** Open until this browser says otherwise. Defaults to closed. */
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSchedule({
  title = 'Schedule',
  count,
  storageKey,
  defaultOpen = false,
  children,
}: CollapsibleScheduleProps) {
  const [open, setOpen] = useStoredFlag(storageKey ? `ui.open.${storageKey}` : null, defaultOpen);

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
