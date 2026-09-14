import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSession, startSession } from './auth/session';
import AppRoutes from './routes';
import routesSource from './routes.tsx?raw';

vi.mock('./pages/Login', () => ({
  default: () => <main>Login route</main>,
}));

vi.mock('./pages/Page404', () => ({
  default: () => <main>Not found route</main>,
}));

vi.mock('./pages/mentor/HistoryClass', () => ({
  default: () => <main>Histórico da turma</main>,
}));

vi.mock('./pages/mentor/LoanCreation', () => ({
  default: () => <main>Criação de empréstimo</main>,
}));

vi.mock('./components/ui/layout', () => ({
  Layout: ({ children }: { children: import('react').ReactNode }) => (
    <>{children}</>
  ),
}));

function renderPath(path: string) {
  const fetchMock = vi.fn();
  const xhrSendMock = vi
    .spyOn(XMLHttpRequest.prototype, 'send')
    .mockImplementation(() => undefined);

  vi.stubGlobal('fetch', fetchMock);
  window.history.pushState({}, '', path);
  render(<AppRoutes />);

  return { fetchMock, xhrSendMock };
}

const encodeSegment = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createToken = (payload: object) =>
  `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;

const removedPrototypeRoutes = [
  '/admin/view-info',
  '/admin/create-info',
  '/admin/insert/launch',
  '/boot',
  '/pre',
];

const removedPrototypePaths = removedPrototypeRoutes.flatMap(
  (route) => [route, `${route}?legacy=true`]
);

afterEach(() => {
  clearSession();
});

describe('AppRoutes', () => {
  it('renders the known login route without requesting an external service', () => {
    const { fetchMock, xhrSendMock } = renderPath('/');

    expect(screen.getByRole('main')).toHaveTextContent('Login route');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrSendMock).not.toHaveBeenCalled();
  });

  it('renders the fallback for an unknown route without requesting an external service', () => {
    const { fetchMock, xhrSendMock } = renderPath(
      '/route-that-does-not-exist'
    );

    expect(screen.getByRole('main')).toHaveTextContent('Not found route');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrSendMock).not.toHaveBeenCalled();
  });

  it('renders the required password-change journey only for a pending session', () => {
    startSession(
      createToken({
        sub: '42',
        role: 'Administrador',
        password_change_required: true,
      })
    );

    const { fetchMock, xhrSendMock } = renderPath('/change-password-required');

    expect(
      screen.getByRole('heading', { name: 'Defina uma nova senha' })
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrSendMock).not.toHaveBeenCalled();
  });

  it.each(removedPrototypePaths)(
    'falls back for a visitor at the removed route %s',
    (path) => {
      const { fetchMock, xhrSendMock } = renderPath(path);

      expect(screen.getByRole('main')).toHaveTextContent('Not found route');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(xhrSendMock).not.toHaveBeenCalled();
    }
  );

  it.each(removedPrototypePaths)(
    'falls back for an authorized synthetic session at the removed route %s',
    (path) => {
      startSession(
        createToken({
          sub: '42',
          role: 'Administrador',
          password_change_required: false,
        })
      );

      const { fetchMock, xhrSendMock } = renderPath(path);

      expect(screen.getByRole('main')).toHaveTextContent('Not found route');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(xhrSendMock).not.toHaveBeenCalled();
    }
  );

  it('redireciona o alias protegido de histórico para a tela coletiva', () => {
    startSession(
      createToken({
        sub: '42',
        role: 'Mentor',
        password_change_required: false,
      })
    );

    renderPath('/mentor/history/mentee');

    expect(screen.getByRole('main')).toHaveTextContent('Histórico da turma');
    expect(screen.queryByText('Criação de empréstimo')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/mentor/history/class');
  });

  it('mantém uma única declaração do layout pai de administrador', () => {
    expect(routesSource.match(/path='\/admin'/g)).toHaveLength(1);
  });
});
