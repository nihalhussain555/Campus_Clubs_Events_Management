import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'campus-clubs-theme';

const QUERY = '(prefers-color-scheme: dark)';

const systemPrefersDark = () => Boolean(window.matchMedia?.(QUERY).matches);

const readMode = () => {
  const stored = localStorage.getItem(STORAGE_KEY);

  return stored === 'dark' || stored === 'light' || stored === 'system'
    ? stored
    : 'system';
};

const resolve = (mode) =>
  mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;

// One module-level store rather than per-component state, so the theme control
// in Account Settings and the one in the navbar agree immediately instead of
// each keeping a private copy of the truth.
let mode = readMode();
const listeners = new Set();

const apply = () => {
  document.documentElement.classList.toggle('dark', resolve(mode) === 'dark');
};

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

if (typeof document !== 'undefined') {
  apply();

  // Only tracked while the user has left the mode on system; a manual choice
  // is theirs to keep.
  window.matchMedia?.(QUERY).addEventListener?.('change', () => {
    if (mode === 'system') {
      apply();
      emit();
    }
  });
}

const setThemeMode = (next) => {
  mode = next;
  localStorage.setItem(STORAGE_KEY, next);
  apply();
  emit();
};

export const useTheme = () => {
  // The snapshot carries both values so an OS-level change in system mode
  // reaches subscribers even though the stored mode itself did not move.
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${mode}:${resolve(mode)}`,
    () => 'system:light'
  );

  const [storedMode, theme] = snapshot.split(':');

  const toggleTheme = useCallback(
    () => setThemeMode(resolve(mode) === 'dark' ? 'light' : 'dark'),
    []
  );

  return {
    theme,
    mode: storedMode,
    setThemeMode,
    toggleTheme
  };
};
