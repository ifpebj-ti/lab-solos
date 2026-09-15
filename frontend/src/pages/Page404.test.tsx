import Cookie from 'js-cookie';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import Page404 from './Page404';
import { clearSession, startSession } from '@/auth/session';

const encodeSegment = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createToken = (payload: object) =>
  `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;

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
    const token = createToken({
      sub: '42',
      role: 'Mentor',
      password_change_required: false,
    });
    startSession(token);

    renderFallback('/rota-inexistente');

    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentor/'
    );
    expect(Cookie.get('doorKey')).toBe(token);
    expect(Cookie.get('rankID')).toBe('42');
    expect(Cookie.get('level')).toBe('Mentor');
  });

  it('prioriza a troca obrigatória sem limpar a sessão', () => {
    const token = createToken({
      sub: '42',
      role: 'Administrador',
      password_change_required: true,
    });
    startSession(token);

    renderFallback('/rota-inexistente');

    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/change-password-required'
    );
    expect(Cookie.get('doorKey')).toBe(token);
  });

  it('mantém o visitante no fluxo de login', () => {
    renderFallback('/rota-inexistente');

    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/'
    );
  });

  it('oferece saída explícita para uma sessão de nível não suportado', () => {
    const token = createToken({
      sub: '42',
      role: 'Comum',
      password_change_required: false,
    });
    startSession(token);

    renderFallback('/rota-inexistente');

    expect(
      screen.getByRole('heading', { name: 'Acesso indisponível' })
    ).toBeInTheDocument();
    screen.getByRole('button', { name: 'Sair' }).click();
    expect(Cookie.get('doorKey')).toBeUndefined();
  });
});
