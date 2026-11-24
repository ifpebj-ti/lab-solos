import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_NOTICE_STORAGE_KEY,
  INTENDED_ROUTE_STORAGE_KEY,
  saveIntendedRoute,
} from '@/auth/intendedRoute';
import { clearSession } from '@/auth/session';

import { authenticate } from './Auth';

const apiMocks = vi.hoisted(() => ({
  request: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/BaseApi', () => ({
  api: Object.assign(apiMocks.request, {
    get: apiMocks.get,
    post: apiMocks.post,
  }),
}));

const loginRequest = {
  method: 'POST',
  params: { email: 'user@example.org', password: 'senha-segura' },
};

const responseFor = (requiresPasswordChange: boolean) => ({
  data: { requiresPasswordChange },
});

const sessionResponseFor = (role: string, requiresPasswordChange: boolean) => ({
  data: {
    userId: '42',
    role,
    requiresPasswordChange,
    csrfToken: 'session-bound-proof',
  },
});

const mockSession = (role: string, requiresPasswordChange: boolean) => {
  apiMocks.request.mockResolvedValue(responseFor(requiresPasswordChange));
  apiMocks.get.mockResolvedValue(
    sessionResponseFor(role, requiresPasswordChange)
  );
};

describe('Auth', () => {
  beforeEach(() => {
    clearSession({ discardAuthContext: true });
    sessionStorage.clear();
    apiMocks.request.mockReset();
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
  });

  it('normaliza uma falha de login sem navegar nem expor a rejeicao remota', async () => {
    apiMocks.request.mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'senha=segredo token=segredo' },
      },
    });
    const navigate = vi.fn();

    const error = await authenticate(loginRequest, navigate).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'authentication',
      status: 401,
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('preserva a espera segura de um 429 de login', async () => {
    apiMocks.request.mockRejectedValue({
      response: {
        status: 429,
        headers: { 'Retry-After': '17' },
        data: {
          code: 'authentication_rate_limited',
          retryAfterSeconds: 91,
          message: 'nao expor detalhe remoto',
        },
      },
    });
    const navigate = vi.fn();

    const error = await authenticate(loginRequest, navigate).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'rate_limited',
      status: 429,
      code: 'authentication_rate_limited',
      retryAfterSeconds: 17,
    });
    expect(JSON.stringify(error)).not.toContain('nao expor detalhe remoto');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('retoma uma rota valida do mesmo perfil depois de iniciar a sessao', async () => {
    const intendedRoute = '/mentor/history/loan?tab=active#latest';
    saveIntendedRoute(intendedRoute);
    mockSession('Mentor', false);
    const navigate = vi.fn();

    await authenticate(loginRequest, navigate);

    expect(navigate).toHaveBeenCalledWith(intendedRoute);
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('usa a home do perfil e descarta rota de outro perfil', async () => {
    saveIntendedRoute('/admin/users?tab=all');
    mockSession('Mentor', false);
    const navigate = vi.fn();

    await authenticate(loginRequest, navigate);

    expect(navigate).toHaveBeenCalledWith('/mentor/');
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('usa a home padrao para perfil desconhecido', async () => {
    saveIntendedRoute('/admin/users');
    mockSession('PerfilDesconhecido', false);
    const navigate = vi.fn();

    await authenticate(loginRequest, navigate);

    expect(navigate).toHaveBeenCalledWith('/');
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('preserva a rota durante a troca obrigatoria e a consome na nova autenticacao', async () => {
    const intendedRoute = '/admin/inventory?filter=low#items';
    saveIntendedRoute(intendedRoute);
    apiMocks.request
      .mockResolvedValueOnce(responseFor(true))
      .mockResolvedValueOnce(responseFor(false));
    apiMocks.get
      .mockResolvedValueOnce(sessionResponseFor('Administrador', true))
      .mockResolvedValueOnce(sessionResponseFor('Administrador', false));
    const navigate = vi.fn();

    await authenticate(loginRequest, navigate);
    expect(navigate).toHaveBeenLastCalledWith('/change-password-required');
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBe(
      intendedRoute
    );

    await authenticate(loginRequest, navigate);
    expect(navigate).toHaveBeenLastCalledWith(intendedRoute);
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('nao cria nem altera aviso de expiracao no login', async () => {
    apiMocks.request.mockRejectedValue({ response: { status: 401 } });
    const navigate = vi.fn();

    await expect(authenticate(loginRequest, navigate)).rejects.toMatchObject({
      category: 'authentication',
    });

    expect(sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBeNull();
  });

  it('normaliza falha local de contrato sem expor a mensagem tecnica', async () => {
    apiMocks.request.mockResolvedValue({
      data: { token: 'token-invalido', requiresPasswordChange: false },
    });
    const navigate = vi.fn();

    const error = await authenticate(loginRequest, navigate).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'unknown',
    });
    expect(JSON.stringify(error)).not.toContain('token-invalido');
    expect(navigate).not.toHaveBeenCalled();
  });
});
