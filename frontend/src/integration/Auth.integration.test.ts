import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/services/BaseApi';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Auth e BaseApi com MSW', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token', { path: '/' });
    Cookie.set('rankID', '42', { path: '/' });
    Cookie.set('level', 'Mentor', { path: '/' });
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState(
      {},
      '',
      '/mentor/private-resource?tab=active#details'
    );
  });

  it('normaliza 401 de Auth/login sem redirecionar nem limpar cookies', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Auth/login`, () =>
        HttpResponse.json(
          { message: 'senha=segredo token=segredo' },
          { status: 401 }
        )
      )
    );

    const replace = vi.fn();
    vi.stubGlobal('location', {
      origin: window.location.origin,
      pathname: '/mentor/private-resource',
      search: '?tab=active',
      hash: '#details',
      replace,
    });

    const error = await api
      .post('/Auth/login', { email: 'user@example.org', password: 'senha' })
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'authentication',
      status: 401,
    });
    expect(replace).not.toHaveBeenCalled();
    expect(Cookie.get('doorKey')).toBe('session-token');
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('preserva sessao, storages, URL e estado para 403', async () => {
    server.use(
      http.get(`${API_ORIGIN}/private-resource`, () =>
        HttpResponse.json({ detail: 'payload remoto secreto' }, { status: 403 })
      )
    );
    sessionStorage.setItem('draft', 'preserve');
    localStorage.setItem('theme', 'dark');
    const currentUrl = window.location.href;

    const error = await api.get('/private-resource').catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'authorization',
      status: 403,
    });
    expect(Cookie.get('doorKey')).toBe('session-token');
    expect(Cookie.get('rankID')).toBe('42');
    expect(Cookie.get('level')).toBe('Mentor');
    expect(sessionStorage.getItem('draft')).toBe('preserve');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(window.location.href).toBe(currentUrl);
  });

  it('deduplica duas respostas 401 privadas na fronteira HTTP', async () => {
    server.use(
      http.get(`${API_ORIGIN}/private-resource`, () =>
        new HttpResponse(null, { status: 401 })
      )
    );
    const replace = vi.fn();
    vi.stubGlobal('location', {
      origin: window.location.origin,
      pathname: '/mentor/private-resource',
      search: '?tab=active',
      hash: '#details',
      replace,
    });

    const errors = await Promise.all([
      api.get('/private-resource').catch((reason: unknown) => reason),
      api.get('/private-resource').catch((reason: unknown) => reason),
    ]);

    expect(errors).toHaveLength(2);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'authentication', status: 401 }),
      ])
    );
    expect(replace).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('auth:intended-route')).toBe(
      '/mentor/private-resource?tab=active#details'
    );
    expect(sessionStorage.getItem('auth:notice')).toBe('session-expired');
  });
});
