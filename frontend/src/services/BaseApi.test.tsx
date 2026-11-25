import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { clearSession } from '@/auth/session';
import {
  AUTH_NOTICE_STORAGE_KEY,
  INTENDED_ROUTE_STORAGE_KEY,
} from '@/auth/intendedRoute';

const responseUse = vi.fn();
const requestUse = vi.fn();
const csrfToken = vi.hoisted(() => vi.fn(() => 'csrf-test-proof'));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: requestUse,
        },
        response: {
          use: responseUse,
        },
      },
    })),
  },
  isAxiosError: vi.fn(() => false),
}));

vi.mock('@/auth/session', () => ({
  clearSession: vi.fn(),
  readCsrfToken: csrfToken,
}));

type RejectedInterceptor = (error: unknown) => Promise<never>;
type RequestInterceptor = (config: {
  method?: string;
  withCredentials?: boolean;
  headers: { delete: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
}) => unknown;

describe('BaseApi', () => {
  let rejectResponse: RejectedInterceptor;
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    requestUse.mockClear();
    responseUse.mockClear();

    window.env = { VITE_API_URL: 'https://api.example.test/' };
    sessionStorage.clear();
    localStorage.clear();
    replace = vi.fn();
    vi.stubGlobal('location', {
      origin: 'http://localhost',
      pathname: '/admin/products',
      search: '?page=2',
      hash: '#items',
      href: '/admin/products?page=2#items',
      replace,
    });

    await import('./BaseApi');
    rejectResponse = responseUse.mock.calls[0][1] as RejectedInterceptor;
  });

  it('cria o cliente com a URL configurada no ambiente', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.test/',
      withCredentials: true,
    });
  });

  it('usa cookies do navegador, remove bearer e envia CSRF em métodos mutáveis', async () => {
    const requestInterceptor = requestUse.mock.calls[0][0] as RequestInterceptor;
    const headers = { delete: vi.fn(), set: vi.fn() };
    const config: Parameters<RequestInterceptor>[0] = {
      method: 'patch',
      withCredentials: false,
      headers,
    };

    expect(requestInterceptor(config)).toBe(config);

    expect(config.withCredentials).toBe(true);
    expect(headers.delete).toHaveBeenCalledWith('Authorization');
    expect(headers.set).toHaveBeenCalledWith('X-CSRF-Token', 'csrf-test-proof');
  });

  it.each([
    [400, 'validation_failed', 'validation'],
    [401, 'authentication_required', 'authentication'],
    [403, 'access_denied', 'authorization'],
    [404, 'resource_not_found', 'not_found'],
    [409, 'operation_conflict', 'conflict'],
    [413, 'request_body_too_large', 'request_too_large'],
    [429, 'admission_rate_limited', 'rate_limited'],
    [503, 'service_unavailable', 'server'],
    [500, 'operation_failed', 'server'],
    [409, 'loan_decision_already_recorded', 'conflict'],
    [409, 'loan_return_already_recorded', 'conflict'],
    [409, 'loan_insufficient_stock', 'conflict'],
    [409, 'loan_opposite_decision_recorded', 'conflict'],
    [409, 'loan_concurrent_conflict', 'conflict'],
    [409, 'loan_not_approved_for_return', 'conflict'],
  ] as const)('preserva o código público %s/%s e sua categoria', async (status, code, category) => {
    const error = {
      response: {
        status,
        headers: { 'X-Correlation-ID': 'server:header-reference' },
        data: {
          status,
          code,
          title: 'Orientação técnica acentuada',
          detail: 'SENTINELA_REMOTA_COM_CREDENCIAL',
          correlationId: 'server:body-reference',
        },
      },
      config: { url: 'Auth/login' },
    };

    await expect(rejectResponse(error)).rejects.toMatchObject({
      name: 'ApplicationError',
      status,
      code,
      category,
      requestId: 'server:body-reference',
    });
  });

  it.each([
    [400, 'validation_failed', 'Os dados informados precisam de revisão.'],
    [404, 'resource_not_found', 'O recurso solicitado não foi encontrado.'],
    [409, 'operation_conflict', 'O conteúdo foi alterado ou já processado.'],
  ] as const)('apresenta a categoria %s com acentos e correlação segura', async (status, code, message) => {
    const normalized = await rejectResponse({
      response: {
        status,
        data: {
          code,
          title: 'SENTINELA_REMOTA',
          detail: 'SENTINELA_REMOTA',
          correlationId: 'server:reference-123',
          errors: { dataValidade: ['SENTINELA_REMOTA'] },
        },
      },
    }).catch((error: unknown) => error);

    render(<ErrorFeedback error={normalized} operation='loans.detail' />);

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('alert')).toHaveTextContent('server:reference-123');
    expect(screen.queryByText(/SENTINELA_REMOTA/)).not.toBeInTheDocument();
    if (status === 400) {
      expect(screen.getByRole('list', { name: 'Campos para revisar' })).toHaveTextContent('dataValidade');
    }
  });

  it('conserva o contrato tipado de confirmação e as datas civis recebidas', async () => {
    await expect(rejectResponse({
      response: {
        status: 409,
        data: {
          code: 'product_expiration_confirmation_required',
          correlationId: 'server:expiry-123',
          dataValidade: '2026-11-16',
          diaCivil: '2026-11-17',
        },
      },
    })).rejects.toMatchObject({
      code: 'product_expiration_confirmation_required',
      requestId: 'server:expiry-123',
      productExpiryConfirmation: {
        dataValidade: '2026-11-16',
        diaCivil: '2026-11-17',
      },
    });
  });

  it('mantém datas civis e instantes inalterados na resposta de sucesso', () => {
    const fulfillResponse = responseUse.mock.calls[0][0] as (response: unknown) => unknown;
    const response = { data: {
      dataValidade: '2026-11-16',
      dataRealizacao: '2026-11-16T03:00:00Z',
    } };

    expect(fulfillResponse(response)).toBe(response);
  });

  it('mantém código desconhecido e detalhe remoto fora do erro apresentado', async () => {
    const error = await rejectResponse({
      response: {
        status: 409,
        data: { code: 'SENTINELA_REMOTA', title: 'SENTINELA_REMOTA', detail: 'SENTINELA_REMOTA' },
      },
    }).catch((value: unknown) => value);

    expect(error).toMatchObject({ category: 'conflict' });
    expect(error).not.toHaveProperty('code');
    expect(JSON.stringify(error)).not.toContain('SENTINELA_REMOTA');
  });

  it('normaliza, guarda a rota e redireciona uma vez ao receber 401 privado', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/private-resource' },
    };

    await expect(rejectResponse(error)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'authentication',
      status: 401,
    });

    expect(clearSession).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/');
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBe(
      '/admin/products?page=2#items'
    );
    expect(sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY)).toBe(
      'session-expired'
    );
  });

  it('nao redireciona nem limpa a sessao para 401 do endpoint de login', async () => {
    const error = {
      response: { status: 401 },
      config: { url: 'Auth/login' },
    };

    await expect(rejectResponse(error)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'authentication',
      status: 401,
    });

    expect(clearSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });

  it('deduplica uma rajada de 401 e preserva o primeiro contexto', async () => {
    const firstError = {
      response: { status: 401 },
      config: { url: '/first-private-resource' },
    };
    const secondError = {
      response: { status: 401 },
      config: { url: '/second-private-resource' },
    };

    await Promise.all([
      expect(rejectResponse(firstError)).rejects.toMatchObject({
        category: 'authentication',
      }),
      expect(rejectResponse(secondError)).rejects.toMatchObject({
        category: 'authentication',
      }),
    ]);

    expect(clearSession).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(INTENDED_ROUTE_STORAGE_KEY)).toBe(
      '/admin/products?page=2#items'
    );
  });

  it('preserva sessao, storages e URL para 403', async () => {
    sessionStorage.setItem('draft', 'keep');
    localStorage.setItem('theme', 'dark');
    const error = {
      response: { status: 403 },
      config: { url: '/private-resource' },
    };

    await expect(rejectResponse(error)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'authorization',
      status: 403,
    });

    expect(clearSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/admin/products');
    expect(sessionStorage.getItem('draft')).toBe('keep');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('continua encerrando e redirecionando quando sessionStorage falha', async () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('storage indisponivel');
    });
    const error = {
      response: { status: 401 },
      config: { url: '/private-resource' },
    };

    await expect(rejectResponse(error)).rejects.toMatchObject({
      category: 'authentication',
    });

    expect(clearSession).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/');
  });
});
