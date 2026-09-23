import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { THEME_STORAGE_KEY } from './themePreference';
import { useTheme } from './themeContext';
import { ThemeProvider } from './ThemeProvider';

type MediaQueryStub = MediaQueryList & { emit: (matches: boolean) => void };

const createMediaQueryStub = (matches: boolean): MediaQueryStub => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let currentMatches = matches;

  return {
    get matches() {
      return currentMatches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void
    ) => listeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void
    ) => listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    dispatchEvent: () => true,
    emit(nextMatches) {
      currentMatches = nextMatches;
      const event = { matches: nextMatches, media: this.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  } as MediaQueryStub;
};

const ThemeProbe = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <output data-testid="theme">{theme}</output>
      <button type="button" onClick={() => setTheme('dark')}>
        Escolher escuro
      </button>
    </div>
  );
};

describe('ThemeProvider', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('gives a stored explicit preference precedence over the system', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const mediaQuery = createMediaQueryStub(false);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('follows system changes only when no explicit preference exists', () => {
    const mediaQuery = createMediaQueryStub(false);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    act(() => mediaQuery.emit(true));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Escolher escuro' }));
    act(() => mediaQuery.emit(false));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('synchronizes a valid preference received from another tab', () => {
    const mediaQuery = createMediaQueryStub(false);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dark',
          storageArea: window.localStorage,
        })
      );
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('keeps the current choice usable when localStorage throws', () => {
    const originalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('storage blocked');
        },
        setItem: () => {
          throw new Error('storage blocked');
        },
      },
    });
    const mediaQuery = createMediaQueryStub(false);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Escolher escuro' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalStorage,
    });
  });
});
