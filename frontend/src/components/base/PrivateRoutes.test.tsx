import Cookie from 'js-cookie';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSession, startSession } from '@/auth/session';
import PrivateRoute from './PrivateRoutes';

const encodeSegment = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createToken = (payload: object) =>
  `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;

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
    const token = createToken({
      sub: '7',
      role: 'Mentor',
      password_change_required: false,
    });
    startSession(token);

    renderProtectedRoute();

    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para minha área' })).toHaveAttribute(
      'href',
      '/mentor/'
    );
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Tela administrativa proibida')).not.toBeInTheDocument();
    expect(Cookie.get('doorKey')).toBe(token);
  });

  it('envia visitante ao Login', () => {
    renderProtectedRoute();

    expect(screen.getByRole('main')).toHaveTextContent('Login');
  });

  it('mostra saída explícita para perfil não suportado', () => {
    startSession(
      createToken({
        sub: '7',
        role: 'Comum',
        password_change_required: false,
      })
    );

    renderProtectedRoute();

    expect(
      screen.getByRole('heading', { name: 'Acesso indisponível' })
    ).toBeInTheDocument();
    screen.getByRole('button', { name: 'Sair' }).click();
    expect(Cookie.get('doorKey')).toBeUndefined();
  });
});
