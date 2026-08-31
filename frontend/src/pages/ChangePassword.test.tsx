import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChangePassword from './ChangePassword';

const mocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  navigate: vi.fn(),
  post: vi.fn(),
  readSession: vi.fn(),
}));

vi.mock('@/auth/session', () => ({
  clearSession: mocks.clearSession,
  readSession: mocks.readSession,
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
  fireEvent.change(screen.getByLabelText('Senha atual'), {
    target: { value: 'senha-atual-valida' },
  });
  fireEvent.change(screen.getByLabelText('Nova senha'), {
    target: { value: 'nova-senha-valida' },
  });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
    target: { value: 'nova-senha-valida' },
  });
};

describe('ChangePassword', () => {
  beforeEach(() => {
    mocks.clearSession.mockReset();
    mocks.navigate.mockReset();
    mocks.post.mockReset();
    mocks.readSession.mockReset();
    mocks.readSession.mockReturnValue({
      token: 'door-key',
      userId: 'user-1',
      role: 'Administrador',
      requiresPasswordChange: false,
    });
  });

  it('envia senha atual, nova senha e confirmação e limpa a sessão antes de navegar', async () => {
    mocks.post.mockResolvedValue({ status: 204 });
    render(<ChangePassword />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('Auth/change-password', {
        currentPassword: 'senha-atual-valida',
        newPassword: 'nova-senha-valida',
        confirmation: 'nova-senha-valida',
      }, {
        headers: {
          Authorization: 'Bearer door-key',
        },
      });
    });

    await waitFor(() => {
      expect(mocks.clearSession).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(mocks.clearSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.navigate.mock.invocationCallOrder[0]
    );
  });

  it('traduz senha atual inválida sem encerrar a sessão automaticamente', async () => {
    mocks.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          errors: {
            currentPassword: ['current_password_invalid'],
          },
        },
      },
    });
    render(<ChangePassword />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));

    expect(
      await screen.findByText('A senha atual está incorreta.')
    ).toBeInTheDocument();
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('treats a 401 from an authenticated change request as session expiration', async () => {
    mocks.post.mockRejectedValue({
      response: { status: 401 },
    });
    render(<ChangePassword />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith(
        'Auth/change-password',
        expect.any(Object),
        {
          headers: {
            Authorization: 'Bearer door-key',
          },
        }
      );
      expect(mocks.clearSession).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
