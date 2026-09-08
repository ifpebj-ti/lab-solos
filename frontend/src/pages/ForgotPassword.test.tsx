import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import ForgotPassword from './ForgotPassword';

const mocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  navigate: vi.fn(),
  post: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/auth/session', () => ({
  clearSession: mocks.clearSession,
}));

vi.mock('@/components/hooks/use-toast', () => ({
  toast: mocks.toast,
}));

vi.mock('@/services/BaseApi', () => ({
  api: { post: mocks.post },
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

describe('ForgotPassword', () => {
  beforeEach(() => {
    mocks.clearSession.mockReset();
    mocks.navigate.mockReset();
    mocks.post.mockReset();
    mocks.toast.mockReset();
  });

  it('usa o contrato seguro e mostra a mesma resposta neutra apÃ³s o 202', async () => {
    mocks.post.mockResolvedValue({ status: 202 });
    render(<ForgotPassword />);
    mocks.clearSession.mockClear();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'usuario@example.org' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Enviar e-mail de recupera/ })
    );

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('/Email/request-password-reset', {
        email: 'usuario@example.org',
      });
    });

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: 'Verifique seu e-mail',
        description: expect.stringContaining('Se a conta estiver apta'),
      });
      expect(mocks.navigate).toHaveBeenCalledWith('/reset-password');
    });
  });

  it('exibe resumo comum e associa validação ao email sem revelar resposta remota', async () => {
    mocks.post.mockRejectedValue(
      createApplicationError({
        category: 'validation',
        message: 'SENTINELA_REMOTA',
        fieldErrors: { email: ['Verifique este campo.'] },
        retryable: false,
      })
    );
    render(<ForgotPassword />);
    mocks.clearSession.mockClear();

    const email = screen.getByRole('textbox', { name: 'Email' });
    fireEvent.change(email, { target: { value: 'usuario@example.org' } });
    fireEvent.click(
      screen.getByRole('button', { name: /Enviar e-mail de recupera/ })
    );

    const summary = await screen.findByRole('alert', {
      name: /N.o foi poss.vel solicitar a recupera..o de senha/i,
    });
    expect(summary).toHaveTextContent('Verifique este campo.');
    expect(summary).not.toHaveTextContent('SENTINELA_REMOTA');
    expect(email).toHaveValue('usuario@example.org');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email.getAttribute('aria-describedby')).toContain('email-error');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Enviar e-mail de recupera/ })
    ).toBeEnabled();
  });

  it('mantém a resposta neutra para sucesso e oferece nova tentativa para indisponibilidade', async () => {
    mocks.post
      .mockRejectedValueOnce(
        createApplicationError({
          category: 'network',
          message: 'SENTINELA_TOKEN_SENHA_STACK',
          retryable: true,
        })
      )
      .mockResolvedValueOnce({ status: 202 });
    render(<ForgotPassword />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'usuario@example.org' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Enviar e-mail de recupera/ })
    );

    const summary = await screen.findByRole('alert', {
      name: /N.o foi poss.vel solicitar a recupera..o de senha/i,
    });
    expect(summary).toHaveTextContent(/Conferir a conex.o e tentar novamente./);
    expect(summary).not.toHaveTextContent('SENTINELA_TOKEN_SENHA_STACK');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledTimes(2);
      expect(mocks.navigate).toHaveBeenCalledWith('/reset-password');
    });
  });
});
