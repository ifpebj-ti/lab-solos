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

vi.mock('./pages/FollowUp', () => ({
  default: () => <main>Alertas administrativos</main>,
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

const createSession = (payload: {
  sub: string;
  role: string;
  password_change_required: boolean;
}) => ({
  userId: payload.sub,
  role: payload.role,
  requiresPasswordChange: payload.password_change_required,
  csrfToken: 'test-session-proof',
});

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
      createSession({
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
        createSession({
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
      createSession({
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

  it('permite à administração navegar para Alertas', () => {
    startSession(
      createSession({
        sub: '42',
        role: 'Administrador',
        password_change_required: false,
      })
    );

    const { fetchMock, xhrSendMock } = renderPath('/admin/follow-up');

    expect(screen.getByRole('main')).toHaveTextContent('Alertas administrativos');
    expect(window.location.pathname).toBe('/admin/follow-up');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrSendMock).not.toHaveBeenCalled();
  });

  it('encaminha a sessão ausente para o login ao navegar para Alertas', () => {
    const { fetchMock, xhrSendMock } = renderPath('/admin/follow-up');

    expect(screen.getByRole('main')).toHaveTextContent('Login route');
    expect(screen.queryByText('Alertas administrativos')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrSendMock).not.toHaveBeenCalled();
  });

  it.each(['Mentor', 'Mentorado'])(
    'recusa a navegação para Alertas ao perfil %s',
    (role) => {
      startSession(
        createSession({ sub: '42', role, password_change_required: false })
      );

      const { fetchMock, xhrSendMock } = renderPath('/admin/follow-up');

      expect(
        screen.getByRole('heading', { name: 'Acesso negado' })
      ).toBeInTheDocument();
      expect(screen.queryByText('Alertas administrativos')).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(xhrSendMock).not.toHaveBeenCalled();
    }
  );
});
