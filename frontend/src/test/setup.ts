import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import Cookie from 'js-cookie';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { server } from './msw/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

const clearBrowserState = () => {
  try {
    window.localStorage.clear();
  } catch {
    // Storage indisponível não deve impedir a limpeza dos demais recursos.
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Storage indisponível não deve impedir a limpeza dos demais recursos.
  }

  try {
    for (const cookieName of Object.keys(Cookie.get())) {
      Cookie.remove(cookieName, { path: '/' });
    }
  } catch {
    // Cookies indisponíveis não devem impedir o encerramento do caso.
  }
};

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearBrowserState();
});

afterAll(() => {
  server.close();
});
