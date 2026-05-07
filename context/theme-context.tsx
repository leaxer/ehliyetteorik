import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadThemeLock, resolveActiveTheme, saveThemeLock, type ActiveTheme, type ThemeLock } from '../constants/theme';

interface ThemeContextValue {
  themeLock: ThemeLock;
  activeTheme: ActiveTheme;
  isDarkTheme: boolean;
  setThemeLock: (themeLock: ThemeLock) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();
  const [themeLock, setThemeLockState] = useState<ThemeLock>('system');

  useEffect(() => {
    let active = true;
    (async () => {
      const storedThemeLock = await loadThemeLock();
      if (active) setThemeLockState(storedThemeLock);
    })();

    return () => {
      active = false;
    };
  }, []);

  const setThemeLock = async (nextThemeLock: ThemeLock) => {
    setThemeLockState(nextThemeLock);
    await saveThemeLock(nextThemeLock);
  };

  const activeTheme = resolveActiveTheme(themeLock, systemTheme);
  const value = useMemo(
    () => ({
      themeLock,
      activeTheme,
      isDarkTheme: activeTheme === 'dark',
      setThemeLock,
    }),
    [activeTheme, themeLock]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
