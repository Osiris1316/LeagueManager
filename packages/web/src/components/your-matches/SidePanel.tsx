import { useEffect, useRef } from 'react';
import { useYourMatches } from '../../context/YourMatchesContext';
import { CHIP_ID } from './FollowChip';
import { CloseIcon, PinIcon } from './icons';
import { YourMatchesBody, YourMatchesHeader } from './YourMatchesBody';

/**
 * Desktop: the panel slides in from the right over the page. On standings it
 * can be pinned, which turns it into a column beside the page instead.
 */
export function SidePanelOverlay({ allowPin }: { allowPin: boolean }) {
  const { panelOpen, closePanel, setPinned } = useYourMatches();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes; focus moves into the panel on open and back to the chip on close.
  useEffect(() => {
    if (!panelOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.getElementById(CHIP_ID)?.focus();
    };
  }, [panelOpen, closePanel]);

  if (!panelOpen) return null;

  return (
    <>
      <div className="ym-backdrop" onClick={closePanel} aria-hidden="true" />
      <aside
        className="ym-panel ym-panel--overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ym-panel-title"
      >
        <YourMatchesHeader
          titleId="ym-panel-title"
          actions={
            <>
              {allowPin && (
                <button
                  type="button"
                  className="ym-icon-btn"
                  onClick={() => { setPinned(true); closePanel(); }}
                  aria-label="Pin panel beside the standings"
                  title="Pin beside the standings"
                >
                  <PinIcon />
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                className="ym-icon-btn"
                onClick={closePanel}
                aria-label="Close your matches"
                title="Close"
              >
                <CloseIcon />
              </button>
            </>
          }
        />
        <div className="ym-panel__body">
          <YourMatchesBody />
        </div>
      </aside>
    </>
  );
}

/** Desktop standings with the panel pinned: a sticky column beside the page. */
export function SidePanelPinned() {
  const { setPinned } = useYourMatches();
  return (
    <aside className="ym-panel ym-panel--pinned" aria-labelledby="ym-pinned-title">
      <YourMatchesHeader
        titleId="ym-pinned-title"
        actions={
          <button
            type="button"
            className="ym-icon-btn ym-icon-btn--active"
            onClick={() => setPinned(false)}
            aria-label="Unpin panel"
            title="Unpin"
          >
            <PinIcon filled />
          </button>
        }
      />
      <div className="ym-panel__body">
        <YourMatchesBody />
      </div>
    </aside>
  );
}
