/**
 * Light and dark mode. "system" follows the device setting; "light" and
 * "dark" pin it. The choice is stored in this browser and applied as
 * <html data-theme="…">, which the colour tokens in global.css read.
 * index.html applies the stored choice before the page paints, so there's
 * no flash of the wrong theme on load.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'ui.theme';

export function readTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage unavailable: the theme still applies for this visit.
  }
}
