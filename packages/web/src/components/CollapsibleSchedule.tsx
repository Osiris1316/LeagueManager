import type { ReactNode } from 'react';

interface CollapsibleScheduleProps {
  title?: string;
  count?: number;
  children: ReactNode;
}

export function CollapsibleSchedule({
  title = 'Schedule',
  count,
  children,
}: CollapsibleScheduleProps) {
  return (
    <details className="collapsible">
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