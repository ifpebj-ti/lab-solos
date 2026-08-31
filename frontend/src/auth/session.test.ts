import Cookie from 'js-cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, readSession, startSession } from './session';

const encodeSegment = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createToken = (payload: object) =>
  `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;

const validToken = createToken({
  sub: '42',
  role: 'Administrador',
  password_change_required: true,
});

describe('session', () => {
  beforeEach(() => {
    document.cookie = 'doorKey=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = 'rankID=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = 'level=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie =
      'sidebar_state=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inicia e lê token, ID, perfil e flag de troca derivada do JWT', () => {
    const session = startSession(validToken);

    expect(session).toEqual({
      token: validToken,
      userId: '42',
      role: 'Administrador',
      requiresPasswordChange: true,
    });
    expect(readSession()).toEqual(session);
  });

  it('cria cookies com atributos comuns sem Secure sob HTTP', () => {
    const setCookie = vi.spyOn(Cookie, 'set');

    startSession(validToken);

    expect(setCookie).toHaveBeenCalledTimes(3);
    for (const [, , options] of setCookie.mock.calls) {
      expect(options).toMatchObject({ path: '/', sameSite: 'Strict' });
      expect(options?.secure).toBe(false);
    }
  });

  it('cria cookies Secure sob HTTPS', () => {
    vi.stubGlobal('location', { protocol: 'https:' });
    const setCookie = vi.spyOn(Cookie, 'set');

    startSession(validToken);

    for (const [, , options] of setCookie.mock.calls) {
      expect(options?.secure).toBe(true);
    }
  });

  it('não autentica nem lança para JWT ausente ou malformado', () => {
    expect(startSession('')).toBeNull();
    expect(startSession('token-invalido')).toBeNull();

    Cookie.set('doorKey', 'token-invalido', { path: '/' });
    Cookie.set('rankID', 'valor-obsoleto', { path: '/' });
    Cookie.set('level', 'valor-obsoleto', { path: '/' });

    expect(readSession()).toBeNull();
  });

  it('limpa apenas autenticação e preserva preferências', () => {
    startSession(validToken);
    Cookie.set('sidebar_state', 'expanded', { path: '/' });
    localStorage.setItem('sidebar-open-items', '["users"]');
    localStorage.setItem('theme', 'dark');
    sessionStorage.setItem('draft', 'preservar');

    clearSession();

    expect(Cookie.get('doorKey')).toBeUndefined();
    expect(Cookie.get('rankID')).toBeUndefined();
    expect(Cookie.get('level')).toBeUndefined();
    expect(Cookie.get('sidebar_state')).toBe('expanded');
    expect(localStorage.getItem('sidebar-open-items')).toBe('["users"]');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(sessionStorage.getItem('draft')).toBe('preservar');
  });

  it('remove os cookies com os mesmos atributos usados na criação', () => {
    const removeCookie = vi.spyOn(Cookie, 'remove');

    clearSession();

    expect(removeCookie).toHaveBeenCalledTimes(3);
    for (const [, options] of removeCookie.mock.calls) {
      expect(options).toMatchObject({ path: '/', sameSite: 'Strict' });
      expect(options?.secure).toBe(window.location.protocol === 'https:');
    }
  });
});
