import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { ThemeContext } from './themeContext';
import {
  applyTheme,
  getSafeLocalStorage,
  getStoredThemePreference,
  getSystemMediaQuery,
  getSystemTheme,
  parseThemePreference,
  persistThemePreference,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from './themePreference';

export function ThemeProvider({ children }: PropsWithChildren) {
  const storage = useMemo(() => getSafeLocalStorage(), []);
  const mediaQuery = useMemo(() => getSystemMediaQuery(), []);
  const initialState = useMemo(() => {
    const storedTheme = getStoredThemePreference(storage);

    return {
      theme: resolveInitialTheme({
        storage,
        systemTheme: getSystemTheme(mediaQuery),
      }),
      hasExplicitPreference: storedTheme !== null,
    };
  }, [mediaQuery, storage]);
  const [theme, setThemeState] = useState<ThemePreference>(initialState.theme);
  const hasExplicitPreference = useRef(initialState.hasExplicitPreference);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      if (!hasExplicitPreference.current) {
        setThemeState(event.matches ? 'dark' : 'light');
      }
    };

    const onStorageChange = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const nextTheme = parseThemePreference(event.newValue);
      if (nextTheme) {
        hasExplicitPreference.current = true;
        setThemeState(nextTheme);
        return;
      }

      hasExplicitPreference.current = false;
      setThemeState(getSystemTheme(mediaQuery));
    };

    window.addEventListener('storage', onStorageChange);
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', onSystemThemeChange);
    } else {
      mediaQuery?.addListener(onSystemThemeChange);
    }

    return () => {
      window.removeEventListener('storage', onStorageChange);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', onSystemThemeChange);
      } else {
        mediaQuery?.removeListener(onSystemThemeChange);
      }
    };
  }, [mediaQuery]);

  const setTheme = useCallback(
    (nextTheme: ThemePreference) => {
      hasExplicitPreference.current = true;
      setThemeState(nextTheme);
      persistThemePreference(nextTheme, storage);
    },
    [storage]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
