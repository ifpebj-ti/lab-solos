import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession, startSession } from '@/auth/session';
import { logoutSession } from '@/integration/Auth';
import PrivateRoute from './PrivateRoutes';

vi.mock('@/integration/Auth', () => ({
  logoutSession: vi.fn(),
  getHomePathForRole: (role: string) =>
    role === 'Mentor' ? '/mentor/' : role === 'Mentorado' ? '/mentee/' : '/admin/',
}));

const createSession = (userId: string, role: string, required = false) => ({
  userId,
  role,
  requiresPasswordChange: required,
  csrfToken: 'session-bound-proof',
});

const renderProtectedRoute = () =>
  render(
    <MemoryRouter initialEntries={['/admin/only'] }>
      <Routes>
        <Route
          path='/admin/only'
          element={
            <PrivateRoute
              element={<main>Tela administrativa proibida</main>}
              requiredRank={['Administrador']}
            />
          }
        />
        <Route path='/' element={<main>Login</main>} />
      </Routes>
    </MemoryRouter>
  );

describe('PrivateRoute', () => {
  beforeEach(() => {
    clearSession();
  });

  afterEach(() => {
    clearSession();
  });

  it('nega perfil incorreto sem montar Login ou a tela proibida', () => {
    startSession(createSession('7', 'Mentor'));

    renderProtectedRoute();

    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para minha área' })).toHaveAttribute(
      'href',
      '/mentor/'
    );
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Tela administrativa proibida')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('auth:session-context')).toContain('Mentor');
  });

  it('envia visitante ao Login', () => {
    renderProtectedRoute();

    expect(screen.getByRole('main')).toHaveTextContent('Login');
  });

  it('mostra saída explícita para perfil não suportado', async () => {
    startSession(createSession('7', 'Comum'));

    renderProtectedRoute();

    expect(
      screen.getByRole('heading', { name: 'Acesso indisponível' })
    ).toBeInTheDocument();
    vi.mocked(logoutSession).mockResolvedValue(undefined);
    screen.getByRole('button', { name: 'Sair' }).click();
    await waitFor(() => expect(logoutSession).toHaveBeenCalledOnce());
  });
});
