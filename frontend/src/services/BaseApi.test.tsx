import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/hooks/use-toast';
import { clearSession } from '@/auth/session';

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
}));

vi.mock('@/auth/session', () => ({
  clearSession: vi.fn(),
}));

vi.mock('@/components/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

type RejectedInterceptor = (error: {
  response?: { status: number };
}) => Promise<never>;

describe('BaseApi', () => {
  let rejectResponse: RejectedInterceptor;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    responseUse.mockClear();

    window.env = { VITE_API_URL: 'https://api.example.test/' };
    vi.stubGlobal('location', { pathname: '/products', href: '/products' });

    await import('./BaseApi');
    rejectResponse = responseUse.mock.calls[0][1] as RejectedInterceptor;
  });

  it('cria o cliente com a URL configurada no ambiente', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.test/',
    });
  });

  it('limpa a sessao e redireciona ao receber 401 fora do login', async () => {
    const error = { response: { status: 401 } };

    await expect(rejectResponse(error)).rejects.toBe(error);

    expect(clearSession).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
    expect(window.location.href).toBe('/');
  });

  it('preserva a sessao para respostas diferentes de 401', async () => {
    const error = { response: { status: 500 } };

    await expect(rejectResponse(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(window.location.href).toBe('/products');
  });
});
