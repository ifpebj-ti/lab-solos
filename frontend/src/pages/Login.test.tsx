import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Login from './Login';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  clearSession: vi.fn(),
  consumeAuthNotice: vi.fn(),
  navigate: vi.fn(),
  notifyError: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/integration/Auth', () => ({
  authenticate: mocks.authenticate,
}));

vi.mock('@/auth/session', () => ({
  clearSession: mocks.clearSession,
}));

vi.mock('@/auth/intendedRoute', () => ({
  consumeAuthNotice: mocks.consumeAuthNotice,
  SESSION_EXPIRED_NOTICE: 'session-expired',
}));

vi.mock('@/errors/presentError', () => ({
  notifyError: mocks.notifyError,
}));

vi.mock('@/components/hooks/use-toast', () => ({
  toast: mocks.toast,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );

  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

function renderLogin() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Login', () => {
  beforeEach(() => {
    mocks.authenticate.mockReset();
    mocks.clearSession.mockReset();
    mocks.consumeAuthNotice.mockReset();
    mocks.navigate.mockReset();
    mocks.notifyError.mockReset();
    mocks.toast.mockReset();
    mocks.consumeAuthNotice.mockReturnValue(null);
  });

  it('consome o aviso de sessao expirada uma unica vez e usa o feedback comum', async () => {
    mocks.consumeAuthNotice.mockReturnValue('session-expired');

    renderLogin();

    await waitFor(() => {
      expect(mocks.consumeAuthNotice).toHaveBeenCalledOnce();
      expect(mocks.notifyError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ApplicationError',
          category: 'authentication',
        }),
        'auth.login'
      );
    });
  });

  it('trata 401 do login como falha normalizada sem navegar novamente', async () => {
    mocks.authenticate.mockRejectedValue({
      name: 'ApplicationError',
      category: 'authentication',
      message: 'Sua sessao expirou ou nao e valida.',
      status: 401,
      retryable: false,
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.org' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submeter Login' }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'authentication' }),
        'auth.login'
      );
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('envia credenciais validas normalizadas e confirma o acesso', async () => {
    mocks.authenticate.mockResolvedValue({ status: 200 } as never);

    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'USER@EXAMPLE.ORG' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submeter Login' }));

    await waitFor(() => {
      expect(mocks.authenticate).toHaveBeenCalledWith(
        {
          method: 'POST',
          params: {
            email: 'user@example.org',
            password: 'senha-segura',
          },
        },
        expect.any(Function)
      );
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Acesso autorizado'),
        })
      );
    });
  });

  it('impede submissao duplicada enquanto a autenticacao esta pendente', async () => {
    let resolveLogin: (value: { status: number }) => void = () => undefined;
    const pendingLogin = new Promise<{ status: number }>((resolve) => {
      resolveLogin = resolve;
    });
    mocks.authenticate.mockReturnValue(pendingLogin);

    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.org' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submeter Login' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Carregando...' })
      ).toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Carregando...' }));
    expect(mocks.authenticate).toHaveBeenCalledOnce();

    resolveLogin({ status: 200 });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submeter Login' })).toBeEnabled();
    });
  });

  it('apresenta a entrada LabOn/IFPE com acao principal e tema publico', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Entrar no LabOn' })
    ).toBeVisible();
    expect(screen.getByText('IFPE')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submeter Login' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Mudar para tema/i })).toBeVisible();
  });
});
