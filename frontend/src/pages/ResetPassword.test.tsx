import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    mocks.post.mockRejectedValue({
      response: {
        status: 400,
        data: { errors: { newPassword: ['password_common'] } },
      },
    });
    render(<ResetPassword />);
    mocks.clearSession.mockClear();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta senha');
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
