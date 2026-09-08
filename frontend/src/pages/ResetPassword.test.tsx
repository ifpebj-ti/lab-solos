import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import ResetPassword from './ResetPassword';

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

const fillValidForm = () => {
  const [emailInput, tokenInput] = screen.getAllByRole('textbox');
  fireEvent.change(emailInput, { target: { value: 'usuario@example.org' } });
  fireEvent.change(tokenInput, { target: { value: 'codigo-seguro' } });
  fireEvent.change(screen.getByLabelText('Nova senha'), {
    target: { value: 'nova-senha-valida' },
  });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
    target: { value: 'nova-senha-valida' },
  });
};

describe('ResetPassword', () => {
  beforeEach(() => {
    mocks.clearSession.mockReset();
    mocks.navigate.mockReset();
    mocks.post.mockReset();
    mocks.toast.mockReset();
  });

  it('envia e-mail, token, nova senha e confirmaÃ§Ã£o pelo contrato seguro', async () => {
    mocks.post.mockResolvedValue({ status: 204 });
    const consoleLog = vi.spyOn(console, 'log');
    render(<ResetPassword />);
    mocks.clearSession.mockClear();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('/Email/reset-password', {
        email: 'usuario@example.org',
        token: 'codigo-seguro',
        newPassword: 'nova-senha-valida',
        confirmation: 'nova-senha-valida',
      });
    });

    await waitFor(() => {
      expect(mocks.clearSession).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(mocks.clearSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.navigate.mock.invocationCallOrder[0]
    );
    expect(consoleLog).not.toHaveBeenCalled();
  });

  it('traduz o cÃ³digo de validaÃ§Ã£o retornado pelo servidor sem encerrar a sessÃ£o', async () => {
    mocks.post.mockRejectedValue(
      createApplicationError({
        category: 'validation',
        message: 'SENTINELA_REMOTA',
        fieldErrors: {
          newPassword: ['Esta senha é muito comum. Escolha outra.'],
        },
        retryable: false,
      })
    );
    render(<ResetPassword />);
    mocks.clearSession.mockClear();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));

    const summary = await screen.findByRole('alert', {
      name: /N.o foi poss.vel redefinir a senha/i,
    });
    expect(summary).toHaveTextContent('Os dados informados precisam de revisão.');
    expect(summary).toHaveTextContent('Esta senha é muito comum. Escolha outra.');
    expect(summary).not.toHaveTextContent('SENTINELA_REMOTA');
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(
      screen.getByLabelText('Nova senha').getAttribute('aria-describedby')
    ).toContain('new-password-error');
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('associa token inválido ao campo sem expor o código bruto', async () => {
    mocks.post.mockRejectedValue(
      createApplicationError({
        category: 'validation',
        code: 'password_reset_invalid',
        message: 'SENTINELA_TOKEN_SENHA_STACK',
        retryable: false,
      })
    );
    render(<ResetPassword />);
    mocks.clearSession.mockClear();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));

    const token = screen.getByLabelText('Token recebido por e-mail');
    expect(
      await screen.findByText('O código de redefinição é inválido ou expirou.')
    ).toBeVisible();
    expect(token).toHaveAttribute('aria-invalid', 'true');
    expect(token.getAttribute('aria-describedby')).toContain('token-error');
    expect(
      screen.getByRole('alert', {
        name: /N.o foi poss.vel redefinir a senha/i,
      })
    ).not.toHaveTextContent('SENTINELA_TOKEN_SENHA_STACK');
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('preserva valores e oferece nova tentativa para falha do servidor', async () => {
    mocks.post
      .mockRejectedValueOnce(
        createApplicationError({
          category: 'server',
          message: 'SENTINELA_TOKEN_SENHA_STACK',
          retryable: true,
        })
      )
      .mockResolvedValueOnce({ status: 204 });
    render(<ResetPassword />);

    fillValidForm();
    const submitButton = screen.getByRole('button', { name: 'Atualizar senha' });
    fireEvent.click(submitButton);

    const summary = await screen.findByRole('alert', {
      name: /N.o foi poss.vel redefinir a senha/i,
    });
    expect(summary).toHaveTextContent('Tentar novamente mais tarde.');
    expect(summary).not.toHaveTextContent('SENTINELA_TOKEN_SENHA_STACK');
    expect(submitButton).toBeEnabled();
    expect(screen.getByLabelText('Token recebido por e-mail')).toHaveValue(
      'codigo-seguro'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledTimes(2);
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('orienta atualização antes de repetir quando a credencial entra em conflito', async () => {
    mocks.post.mockRejectedValue(
      createApplicationError({
        category: 'conflict',
        code: 'credential_concurrency_conflict',
        message: 'SENTINELA_REMOTA',
        retryable: false,
      })
    );
    render(<ResetPassword />);
    mocks.clearSession.mockClear();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));

    const summary = await screen.findByRole('alert', {
      name: /N.o foi poss.vel redefinir a senha/i,
    });
    expect(summary).toHaveTextContent(
      'Atualizar os dados antes de tentar novamente.'
    );
    expect(summary).not.toHaveTextContent('SENTINELA_REMOTA');
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
