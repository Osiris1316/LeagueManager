import { useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { useYourMatches } from '../../context/YourMatchesContext';
import { CHIP_ID } from './FollowChip';
import { CloseIcon } from './icons';
import { YourMatchesBody, YourMatchesHeader } from './YourMatchesBody';

/** How far (px) the sheet must be dragged down before letting go closes it. */
const CLOSE_DISTANCE = 80;

/**
 * Phones: the full "your matches" list rises from the bottom of the screen.
 * Swipe the handle down, tap outside, press Escape or tap close to dismiss.
 */
export function BottomSheet() {
  const { panelOpen, closePanel } = useYourMatches();
  const [dragOffset, setDragOffset] = useState(0);
  const dragStart = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    closeRef.current?.focus();
    // Stop the page behind from scrolling while the sheet is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      document.getElementById(CHIP_ID)?.focus();
    };
  }, [panelOpen, closePanel]);

  if (!panelOpen) return null;

  const onTouchStart = (e: TouchEvent) => {
    dragStart.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (dragStart.current == null) return;
    const y = e.touches[0]?.clientY ?? dragStart.current;
    setDragOffset(Math.max(0, y - dragStart.current));
  };
  const onTouchEnd = () => {
    if (dragOffset > CLOSE_DISTANCE) closePanel();
    dragStart.current = null;
    setDragOffset(0);
  };

  return (
    <>
      <div className="ym-backdrop" onClick={closePanel} aria-hidden="true" />
      <div
        className={`ym-sheet${dragOffset ? ' ym-sheet--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ym-sheet-title"
        // The drag offset changes every frame, so it can't live in the stylesheet.
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        <div
          className="ym-sheet__grab"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="ym-sheet__handle" aria-hidden="true" />
          <YourMatchesHeader
            titleId="ym-sheet-title"
            actions={
              <button
                ref={closeRef}
                type="button"
                className="ym-icon-btn"
                onClick={closePanel}
                aria-label="Close your matches"
              >
                <CloseIcon />
              </button>
            }
          />
        </div>
        <div className="ym-sheet__body">
          <YourMatchesBody />
        </div>
      </div>
    </>
  );
}
