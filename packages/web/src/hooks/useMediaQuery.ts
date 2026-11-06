import { useEffect, useState } from 'react';

/**
 * Wide screens (laptop width and up) get the side panel; anything narrower
 * gets the ribbon and bottom sheet. Keep in step with the 68.75rem media
 * queries in global.css.
 */
export const DESKTOP_QUERY = '(min-width: 68.75rem)';

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

/** True while the media query matches; updates as the window resizes. */
export function useMediaQuery(query: string): boolean {
  const [isMatch, setIsMatch] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = () => setIsMatch(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return isMatch;
}

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
