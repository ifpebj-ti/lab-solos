import { describe, expect, it } from 'vitest';

import {
  AUTH_NOTICE_STORAGE_KEY,
  INTENDED_ROUTE_STORAGE_KEY,
  consumeAuthNotice,
  consumeIntendedRoute,
  discardAuthNotice,
  discardIntendedRoute,
  saveAuthNotice,
  saveIntendedRoute,
} from './intendedRoute';

type MemoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const createMemoryStorage = (): MemoryStorage => {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

describe('intendedRoute', () => {
  it('preserva a rota interna com pathname, query e hash até 2.048 caracteres', () => {
    const storage = createMemoryStorage();
    const routePrefix = '/admin/users?tab=active#';
    const route = `${routePrefix}${'x'.repeat(
      2_048 - routePrefix.length
    )}`;

    expect(route).toHaveLength(2_048);
    expect(saveIntendedRoute(route, storage)).toBe(true);
    expect(consumeIntendedRoute('Administrador', storage)).toBe(route);
  });

  it('recusa rotas acima do limite sem apagar a primeira rota válida', () => {
    const storage = createMemoryStorage();
    const validRoute = '/mentor/my-class?filter=active#results';

    expect(saveIntendedRoute(validRoute, storage)).toBe(true);
    expect(saveIntendedRoute(`/admin/${'x'.repeat(2_048)}`, storage)).toBe(
      false
    );
    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBe(validRoute);
  });

  it.each([
    'https://evil.example/admin',
    'https://localhost/admin',
    '//evil.example/admin',
    '/administrator',
    '/mentored',
    '/mentees/profile',
    '/',
    '/login/',
    '/forgot-your-password?return=/admin',
    '/reset-password',
    '/create-account',
    '/change-password-required',
  ])('recusa rota insegura ou pública: %s', (route) => {
    const storage = createMemoryStorage();

    expect(saveIntendedRoute(route, storage)).toBe(false);
    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('recusa URL absoluta da própria origem, mesmo quando o caminho é privado', () => {
    const storage = createMemoryStorage();
    const absoluteRoute = new URL('/admin/users', window.location.origin).href;

    expect(saveIntendedRoute(absoluteRoute, storage)).toBe(false);
    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('consome uma vez e exige o prefixo correspondente ao perfil autenticado', () => {
    const storage = createMemoryStorage();

    expect(saveIntendedRoute('/admin/users?tab=all#top', storage)).toBe(true);
    expect(consumeIntendedRoute('Mentor', storage)).toBeNull();
    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
    expect(consumeIntendedRoute('Administrador', storage)).toBeNull();

    expect(saveIntendedRoute('/mentee/history/loan', storage)).toBe(true);
    expect(consumeIntendedRoute('Mentorado', storage)).toBe(
      '/mentee/history/loan'
    );
    expect(consumeIntendedRoute('Mentorado', storage)).toBeNull();
  });

  it('não aceita perfil ausente ou desconhecido no consumo', () => {
    const storage = createMemoryStorage();

    saveIntendedRoute('/admin', storage);

    expect(consumeIntendedRoute('', storage)).toBeNull();
    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('preserva a primeira rota válida durante uma troca obrigatória', () => {
    const storage = createMemoryStorage();

    expect(saveIntendedRoute('/mentor/history/class', storage)).toBe(true);
    expect(saveIntendedRoute('/change-password-required', storage)).toBe(false);
    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBe(
      '/mentor/history/class'
    );
  });

  it('consome o aviso separadamente da rota e apenas uma vez', () => {
    const storage = createMemoryStorage();

    expect(saveIntendedRoute('/admin', storage)).toBe(true);
    expect(saveAuthNotice(storage)).toBe(true);

    expect(consumeAuthNotice(storage)).toBe('session-expired');
    expect(consumeAuthNotice(storage)).toBeNull();
    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBe('/admin');
    expect(storage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBeNull();

    expect(consumeIntendedRoute('Administrador', storage)).toBe('/admin');
    expect(storage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBeNull();
  });

  it('descarta explicitamente rota e aviso sem misturar seus ciclos de vida', () => {
    const storage = createMemoryStorage();

    saveIntendedRoute('/admin', storage);
    saveAuthNotice(storage);
    discardIntendedRoute(storage);

    expect(storage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBe('session-expired');

    discardAuthNotice(storage);
    expect(storage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBeNull();
  });

  it('não lança quando leitura, escrita ou remoção do storage falham', () => {
    const unavailableStorage: MemoryStorage = {
      getItem: () => {
        throw new Error('storage indisponível');
      },
      setItem: () => {
        throw new Error('storage indisponível');
      },
      removeItem: () => {
        throw new Error('storage indisponível');
      },
    };

    expect(() => saveIntendedRoute('/admin', unavailableStorage)).not.toThrow();
    expect(() => consumeIntendedRoute('Administrador', unavailableStorage)).not.toThrow();
    expect(() => discardIntendedRoute(unavailableStorage)).not.toThrow();
    expect(() => saveAuthNotice(unavailableStorage)).not.toThrow();
    expect(() => consumeAuthNotice(unavailableStorage)).not.toThrow();
    expect(() => discardAuthNotice(unavailableStorage)).not.toThrow();
  });
});
