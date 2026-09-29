import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePreferencesStore } from '../features/settings/store/preferences.store';
import { darkPalette, lightPalette, type Palette } from './palette';

interface ThemeValue {
  colors: Palette;
  isDark: boolean;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeValue>({ colors: lightPalette, isDark: false, setDark: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const darkMode = usePreferencesStore((s) => s.darkMode);
  const setPrefs = usePreferencesStore((s) => s.set);
  const load = usePreferencesStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<ThemeValue>(
    () => ({ colors: darkMode ? darkPalette : lightPalette, isDark: darkMode, setDark: (dark) => setPrefs({ darkMode: dark }) }),
    [darkMode, setPrefs],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Styles dépendants du thème, recalculés uniquement au changement de palette. */
export function makeStyles<T>(factory: (colors: Palette) => T): () => T {
  return function useStyles() {
    const { colors } = useTheme();
    return useMemo(() => factory(colors), [colors]);
  };
}
