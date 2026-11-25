import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Page404 from './Page404';
import { clearSession, readSession, startSession } from '@/auth/session';
import { logoutSession } from '@/integration/Auth';

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

const renderFallback = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='*' element={<Page404 />} />
      </Routes>
    </MemoryRouter>
  );

describe('Page404', () => {
  beforeEach(() => {
    clearSession();
  });

  afterEach(() => {
    clearSession();
  });

  it('preserva a sessão e retorna à home do perfil autenticado', () => {
    startSession(createSession('42', 'Mentor'));

    renderFallback('/rota-inexistente');

    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentor/'
    );
    expect(readSession()).toMatchObject({ userId: '42', role: 'Mentor' });
  });

  it('prioriza a troca obrigatória sem limpar a sessão', () => {
    startSession(createSession('42', 'Administrador', true));

    renderFallback('/rota-inexistente');

    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/change-password-required'
    );
    expect(readSession()).toMatchObject({ role: 'Administrador' });
  });

  it('mantém o visitante no fluxo de login', () => {
    renderFallback('/rota-inexistente');

    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/'
    );
  });

  it('oferece saída explícita para uma sessão de nível não suportado', async () => {
    startSession(createSession('42', 'Comum'));
    vi.mocked(logoutSession).mockResolvedValue(undefined);

    renderFallback('/rota-inexistente');

    expect(
      screen.getByRole('heading', { name: 'Acesso indisponível' })
    ).toBeInTheDocument();
    screen.getByRole('button', { name: 'Sair' }).click();
    await waitFor(() => expect(logoutSession).toHaveBeenCalledOnce());
  });
});
