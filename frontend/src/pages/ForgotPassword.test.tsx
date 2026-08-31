import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
