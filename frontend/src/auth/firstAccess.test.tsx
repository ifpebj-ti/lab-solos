import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticate } from '@/integration/Auth';
import { startSession } from '@/auth/session';
import PrivateRoute from '@/components/base/PrivateRoutes';
import PasswordChangeRequiredRoute from '@/components/base/PasswordChangeRequiredRoute';

const apiMocks = vi.hoisted(() => ({ request: vi.fn(), get: vi.fn() }));
vi.mock('@/services/BaseApi', () => ({
  api: Object.assign(apiMocks.request, { get: apiMocks.get }),
}));

const sessionContext = (userId: string, role: string, required: boolean) => ({
  userId,
  role,
  requiresPasswordChange: required,
  csrfToken: 'session-bound-proof',
});

describe('primeiro acesso', () => {
  beforeEach(() => {
    sessionStorage.clear();
    apiMocks.request.mockReset();
    apiMocks.get.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('inicia a sessão e navega somente para a troca quando o login a exige', async () => {
    const navigate = vi.fn();

    apiMocks.request.mockResolvedValue({ data: { requiresPasswordChange: true } });
    apiMocks.get.mockResolvedValue({ data: sessionContext('42', 'Administrador', true) });

    await authenticate(
      {
        method: 'POST',
        params: { email: 'admin@example.org', password: 'senha-temporaria' },
      },
      navigate
    );

    expect(sessionStorage.getItem('auth:session-context')).toContain('Administrador');
    expect(navigate).toHaveBeenCalledWith('/change-password-required');
    expect(navigate).not.toHaveBeenCalledWith('/admin/');
  });

  it('mantém a navegação por perfil quando o login não exige troca', async () => {
    const navigate = vi.fn();

    apiMocks.request.mockResolvedValue({ data: { requiresPasswordChange: false } });
    apiMocks.get.mockResolvedValue({ data: sessionContext('7', 'Mentor', false) });

    await authenticate(
      {
        method: 'POST',
        params: { email: 'mentor@example.org', password: 'senha-atual' },
      },
      navigate
    );

    expect(navigate).toHaveBeenCalledWith('/mentor/');
  });

  it('redireciona uma sessão pendente de qualquer rota privada para a troca obrigatória', () => {
    startSession(sessionContext('42', 'Administrador', true));

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path='/admin'
            element={
              <PrivateRoute
                element={<main>Área privada</main>}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='/change-password-required'
            element={<main>Troca obrigatória</main>}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toHaveTextContent('Troca obrigatória');
  });

  it('impede a rota de troca obrigatória sem uma sessão pendente', () => {
    startSession(sessionContext('42', 'Administrador', false));

    render(
      <MemoryRouter initialEntries={['/change-password-required']}>
        <Routes>
          <Route
            path='/change-password-required'
            element={
              <PasswordChangeRequiredRoute
                element={<main>Troca obrigatória</main>}
              />
            }
          />
          <Route path='/' element={<main>Login</main>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toHaveTextContent('Login');
  });
});
