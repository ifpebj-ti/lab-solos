import Cookie from 'js-cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  readCsrfToken,
  readSession,
  startSession,
} from './session';
import {
  AUTH_NOTICE_STORAGE_KEY,
  INTENDED_ROUTE_STORAGE_KEY,
} from './intendedRoute';

const sessionResponse = {
  userId: '42',
  role: 'Administrador',
  requiresPasswordChange: true,
  csrfToken: 'session-bound-proof',
};

describe('session', () => {
  beforeEach(() => {
    for (const key of ['doorKey', 'rankID', 'level', 'sidebar_state']) {
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('armazena somente o contexto mínimo recebido do servidor e a prova CSRF', () => {
    const session = startSession(sessionResponse);

    expect(session).toEqual({
      userId: '42',
      role: 'Administrador',
      requiresPasswordChange: true,
    });
    expect(readSession()).toEqual(session);
    expect(readCsrfToken()).toBe('session-bound-proof');
    expect(sessionStorage.getItem('auth:session-context')).toBe(
      JSON.stringify(session)
    );
    expect(sessionStorage.getItem('auth:session-context')).not.toContain(
      'session-bound-proof'
    );
  });

  it('normaliza o identificador numérico do contrato HTTP para o contexto do cliente', () => {
    const session = startSession({ ...sessionResponse, userId: 42 });

    expect(session?.userId).toBe('42');
    expect(readSession()?.userId).toBe('42');
  });

  it('não cria cookies JavaScript de credencial ou perfil', () => {
    startSession(sessionResponse);

    expect(Cookie.get('doorKey')).toBeUndefined();
    expect(Cookie.get('rankID')).toBeUndefined();
    expect(Cookie.get('level')).toBeUndefined();
  });

  it('rejeita contexto malformado sem usar cookies legados como autenticação', () => {
    Cookie.set('doorKey', 'token-invalido', { path: '/' });
    Cookie.set('rankID', '42', { path: '/' });
    Cookie.set('level', 'Administrador', { path: '/' });

    expect(startSession({ ...sessionResponse, csrfToken: '' })).toBeNull();
    expect(readSession()).toBeNull();
    expect(readCsrfToken()).toBeNull();
  });

  it('limpa contexto e cookies legados, preservando preferências e rascunhos', () => {
    startSession(sessionResponse);
    Cookie.set('doorKey', 'legacy-token', { path: '/' });
    Cookie.set('rankID', '42', { path: '/' });
    Cookie.set('level', 'Administrador', { path: '/' });
    Cookie.set('sidebar_state', 'expanded', { path: '/' });
    localStorage.setItem('sidebar-open-items', '["users"]');
    localStorage.setItem('theme', 'dark');
    sessionStorage.setItem('draft', 'preservar');

    clearSession();

    expect(readSession()).toBeNull();
    expect(readCsrfToken()).toBeNull();
    expect(Cookie.get('doorKey')).toBeUndefined();
    expect(Cookie.get('rankID')).toBeUndefined();
    expect(Cookie.get('level')).toBeUndefined();
    expect(Cookie.get('sidebar_state')).toBe('expanded');
    expect(localStorage.getItem('sidebar-open-items')).toBe('["users"]');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(sessionStorage.getItem('draft')).toBe('preservar');
  });

  it('descarta rota e aviso somente no encerramento explicito', () => {
    sessionStorage.setItem(INTENDED_ROUTE_STORAGE_KEY, '/admin');
    sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, 'session-expired');

    clearSession();

    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBe('/admin');
    expect(sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBe(
      'session-expired'
    );

    clearSession({ discardAuthContext: true });

    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBeNull();
  });
});
