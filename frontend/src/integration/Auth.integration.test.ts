import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/services/BaseApi';
import { authenticate } from './Auth';
import { server } from '@/test/msw/server';
import { readSession, startSession } from '@/auth/session';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Auth e BaseApi com MSW', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    startSession({
      userId: '42',
      role: 'Mentor',
      requiresPasswordChange: false,
      csrfToken: 'session-bound-proof',
    });
    window.history.replaceState(
      {},
      '',
      '/mentor/private-resource?tab=active#details'
    );
  });

  it('normaliza 401 de Auth/login sem redirecionar nem limpar o contexto anterior', async () => {
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
    expect(readSession()?.userId).toBe('42');
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
    expect(readSession()).toMatchObject({ userId: '42', role: 'Mentor' });
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

  it('conclui login por MSW e persiste a sessao para o perfil autenticado', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Auth/login`, async ({ request }) => {
        expect(await request.json()).toEqual({
          email: 'user@example.org',
          password: 'senha-segura',
        });
        expect(request.headers.get('authorization')).toBeNull();
        return HttpResponse.json({ requiresPasswordChange: false }, { status: 200 });
      }),
      http.get(`${API_ORIGIN}/Auth/session`, () =>
        HttpResponse.json({
          userId: '42',
          role: 'Mentor',
          requiresPasswordChange: false,
          csrfToken: 'rotated-session-proof',
        })
      )
    );
    const navigate = vi.fn();

    const response = await authenticate(
      {
        method: 'POST',
        params: { email: 'user@example.org', password: 'senha-segura' },
      },
      navigate
    );

    expect(response.status).toBe(200);
    expect(navigate).toHaveBeenCalledWith('/mentor/');
    expect(readSession()).toEqual({
      userId: '42',
      role: 'Mentor',
      requiresPasswordChange: false,
    });
  });
});
