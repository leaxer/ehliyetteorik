import * as SecureStore from 'expo-secure-store';
import type { ColorSchemeName } from 'react-native';

export const PROFILE_SETTINGS_KEY = 'profileSettings';

export type ThemeLock = 'system' | 'light' | 'dark';
export type ActiveTheme = 'light' | 'dark';

const isThemeLock = (value: unknown): value is ThemeLock =>
  value === 'system' || value === 'light' || value === 'dark';

export const resolveActiveTheme = (themeLock: ThemeLock, systemTheme: ColorSchemeName): ActiveTheme => {
  if (themeLock === 'system') {
    return systemTheme === 'dark' ? 'dark' : 'light';
  }
  return themeLock;
};

export const loadThemeLock = async (): Promise<ThemeLock> => {
  try {
    const rawSettings = await SecureStore.getItemAsync(PROFILE_SETTINGS_KEY);
    if (!rawSettings) return 'system';

    const parsed = JSON.parse(rawSettings);
    return isThemeLock(parsed?.themeLock) ? parsed.themeLock : 'system';
  } catch {
    return 'system';
  }
};

export const saveThemeLock = async (themeLock: ThemeLock): Promise<void> => {
  try {
    const rawSettings = await SecureStore.getItemAsync(PROFILE_SETTINGS_KEY);
    if (!rawSettings) {
      await SecureStore.setItemAsync(PROFILE_SETTINGS_KEY, JSON.stringify({ themeLock }));
      return;
    }

    const parsed = JSON.parse(rawSettings);
    const nextSettings = typeof parsed === 'object' && parsed !== null ? { ...parsed, themeLock } : { themeLock };
    await SecureStore.setItemAsync(PROFILE_SETTINGS_KEY, JSON.stringify(nextSettings));
  } catch {
    await SecureStore.setItemAsync(PROFILE_SETTINGS_KEY, JSON.stringify({ themeLock }));
  }
};
