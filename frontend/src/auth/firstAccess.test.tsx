import Cookie from 'js-cookie';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticate } from '@/integration/Auth';
import { api } from '@/services/BaseApi';
import { startSession } from '@/auth/session';
import PrivateRoute from '@/components/base/PrivateRoutes';
import PasswordChangeRequiredRoute from '@/components/base/PasswordChangeRequiredRoute';

vi.mock('@/services/BaseApi', () => ({
  api: vi.fn(),
}));

const encodeSegment = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createToken = (payload: object) =>
  `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;

describe('primeiro acesso', () => {
  beforeEach(() => {
    Cookie.remove('doorKey', { path: '/' });
    Cookie.remove('rankID', { path: '/' });
    Cookie.remove('level', { path: '/' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('inicia a sessão e navega somente para a troca quando o login a exige', async () => {
    const token = createToken({
      sub: '42',
      role: 'Administrador',
      password_change_required: true,
    });
    const navigate = vi.fn();

    vi.mocked(api).mockResolvedValue({
      data: { token, requiresPasswordChange: true },
    } as never);

    await authenticate(
      {
        method: 'POST',
        params: { email: 'admin@example.org', password: 'senha-temporaria' },
      },
      navigate
    );

    expect(Cookie.get('doorKey')).toBe(token);
    expect(navigate).toHaveBeenCalledWith('/change-password-required');
    expect(navigate).not.toHaveBeenCalledWith('/admin/');
  });

  it('mantém a navegação por perfil quando o login não exige troca', async () => {
    const token = createToken({
      sub: '7',
      role: 'Mentor',
      password_change_required: false,
    });
    const navigate = vi.fn();

    vi.mocked(api).mockResolvedValue({
      data: { token, requiresPasswordChange: false },
    } as never);

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
    startSession(
      createToken({
        sub: '42',
        role: 'Administrador',
        password_change_required: true,
      })
    );

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
    startSession(
      createToken({
        sub: '42',
        role: 'Administrador',
        password_change_required: false,
      })
    );

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
