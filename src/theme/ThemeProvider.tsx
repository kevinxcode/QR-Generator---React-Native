import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings.store';

import { darkPalette, lightPalette, type Palette } from './tokens';

const ThemeContext = createContext<Palette>(lightPalette);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.settings.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const palette = useMemo(() => (scheme === 'dark' ? darkPalette : lightPalette), [scheme]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
