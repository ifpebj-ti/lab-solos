import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_NOTICE_STORAGE_KEY,
  INTENDED_ROUTE_STORAGE_KEY,
  saveIntendedRoute,
} from '@/auth/intendedRoute';
import { clearSession } from '@/auth/session';
import { api } from '@/services/BaseApi';

import { authenticate } from './Auth';

vi.mock('@/services/BaseApi', () => ({
  api: vi.fn(),
}));

const encodeSegment = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createToken = (payload: object) =>
  `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;

const loginRequest = {
  method: 'POST',
  params: { email: 'user@example.org', password: 'senha-segura' },
};

const responseFor = (role: string, requiresPasswordChange: boolean) => {
  const token = createToken({
    sub: '42',
    role,
    password_change_required: requiresPasswordChange,
  });

  return {
    data: { token, requiresPasswordChange },
  };
};

describe('Auth', () => {
  beforeEach(() => {
    clearSession({ discardAuthContext: true });
    sessionStorage.clear();
    vi.mocked(api).mockReset();
  });

  it('normaliza uma falha de login sem navegar nem expor a rejeicao remota', async () => {
    vi.mocked(api).mockRejectedValue({
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

  it('retoma uma rota valida do mesmo perfil depois de iniciar a sessao', async () => {
    const intendedRoute = '/mentor/history/loan?tab=active#latest';
    saveIntendedRoute(intendedRoute);
    vi.mocked(api).mockResolvedValue(responseFor('Mentor', false) as never);
    const navigate = vi.fn();

    await authenticate(loginRequest, navigate);

    expect(navigate).toHaveBeenCalledWith(intendedRoute);
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('usa a home do perfil e descarta rota de outro perfil', async () => {
    saveIntendedRoute('/admin/users?tab=all');
    vi.mocked(api).mockResolvedValue(responseFor('Mentor', false) as never);
    const navigate = vi.fn();

    await authenticate(loginRequest, navigate);

    expect(navigate).toHaveBeenCalledWith('/mentor/');
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('usa a home padrao para perfil desconhecido', async () => {
    saveIntendedRoute('/admin/users');
    vi.mocked(api).mockResolvedValue(
      responseFor('PerfilDesconhecido', false) as never
    );
    const navigate = vi.fn();

    await authenticate(loginRequest, navigate);

    expect(navigate).toHaveBeenCalledWith('/');
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBeNull();
  });

  it('preserva a rota durante a troca obrigatoria e a consome na nova autenticacao', async () => {
    const intendedRoute = '/admin/inventory?filter=low#items';
    saveIntendedRoute(intendedRoute);
    vi.mocked(api)
      .mockResolvedValueOnce(responseFor('Administrador', true) as never)
      .mockResolvedValueOnce(responseFor('Administrador', false) as never);
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
    vi.mocked(api).mockRejectedValue({ response: { status: 401 } });
    const navigate = vi.fn();

    await expect(authenticate(loginRequest, navigate)).rejects.toMatchObject({
      category: 'authentication',
    });

    expect(sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBeNull();
  });

  it('normaliza falha local de contrato sem expor a mensagem tecnica', async () => {
    vi.mocked(api).mockResolvedValue({
      data: { token: 'token-invalido', requiresPasswordChange: false },
    } as never);
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
