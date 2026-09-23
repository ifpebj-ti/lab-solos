import { describe, expect, it, vi } from 'vitest';

import {
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredThemePreference,
  parseThemePreference,
  persistThemePreference,
  resolveInitialTheme,
} from './themePreference';

const createStorage = (initial: string | null = null): Storage => {
  let value = initial;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(() => null),
    get length() {
      return value === null ? 0 : 1;
    },
  } as unknown as Storage;
};

describe('themePreference', () => {
  it('accepts only the supported persisted preferences', () => {
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('system')).toBeNull();
    expect(parseThemePreference(null)).toBeNull();
  });

  it('ignores invalid stored values and resolves the system preference', () => {
    const storage = createStorage('invalid');

    expect(getStoredThemePreference(storage)).toBeNull();
    expect(resolveInitialTheme({ storage, systemTheme: 'dark' })).toBe('dark');
  });

  it('does not throw when storage is unavailable', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('storage blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('storage blocked');
      }),
    } as unknown as Storage;

    expect(() => getStoredThemePreference(storage)).not.toThrow();
    expect(() => persistThemePreference('dark', storage)).not.toThrow();
    expect(resolveInitialTheme({ storage, systemTheme: 'light' })).toBe('light');
  });

  it('persists only the versioned theme preference', () => {
    const storage = createStorage();

    expect(persistThemePreference('dark', storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
  });

  it('applies the class, data attribute and browser color scheme to the root', () => {
    const root = document.createElement('html');

    applyTheme('dark', root);

    expect(root).toHaveClass('dark');
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root.style.colorScheme).toBe('dark');

    applyTheme('light', root);

    expect(root).not.toHaveClass('dark');
    expect(root).toHaveAttribute('data-theme', 'light');
    expect(root.style.colorScheme).toBe('light');
  });
});
