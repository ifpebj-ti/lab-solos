import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession } from '@/auth/session';
import {
  AUTH_NOTICE_STORAGE_KEY,
  INTENDED_ROUTE_STORAGE_KEY,
} from '@/auth/intendedRoute';

const responseUse = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
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
}));

type RejectedInterceptor = (error: unknown) => Promise<never>;

describe('BaseApi', () => {
  let rejectResponse: RejectedInterceptor;
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
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
    });
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
