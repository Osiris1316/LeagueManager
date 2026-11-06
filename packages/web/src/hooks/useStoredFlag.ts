import { useCallback, useState } from 'react';

function read(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === '1';
  } catch {
    return fallback;
  }
}

/**
 * An on/off view preference remembered in this browser, such as "panel
 * pinned" or "ribbon collapsed". If storage is blocked (private mode), the
 * setting still works for the visit; it just isn't remembered.
 */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => read(key, fallback));

  const update = useCallback((next: boolean) => {
    setValue(next);
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch {
      // Storage unavailable: keep the in-memory value only.
    }
  }, [key]);

  return [value, update];
}
