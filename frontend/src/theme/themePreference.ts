export const THEME_STORAGE_KEY = 'labon.theme.v1';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const themePreferences = ['light', 'dark'] as const;
export type ThemePreference = (typeof themePreferences)[number];

export const parseThemePreference = (
  value: unknown
): ThemePreference | null => {
  return value === 'light' || value === 'dark' ? value : null;
};

export const getSafeLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getSystemMediaQuery = (): MediaQueryList | null => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  try {
    return window.matchMedia(THEME_MEDIA_QUERY);
  } catch {
    return null;
  }
};

export const getSystemTheme = (
  mediaQuery: Pick<MediaQueryList, 'matches'> | null = getSystemMediaQuery()
): ThemePreference => {
  return mediaQuery?.matches ? 'dark' : 'light';
};

export const getStoredThemePreference = (
  storage: Storage | null = getSafeLocalStorage()
): ThemePreference | null => {
  if (!storage) {
    return null;
  }

  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const persistThemePreference = (
  theme: ThemePreference,
  storage: Storage | null = getSafeLocalStorage()
): boolean => {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
};

export const resolveInitialTheme = ({
  storage = getSafeLocalStorage(),
  systemTheme = getSystemTheme(),
}: {
  storage?: Storage | null;
  systemTheme?: ThemePreference;
} = {}): ThemePreference => {
  return getStoredThemePreference(storage) ?? systemTheme;
};

export const applyTheme = (
  theme: ThemePreference,
  root: HTMLElement = document.documentElement
): void => {
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};
