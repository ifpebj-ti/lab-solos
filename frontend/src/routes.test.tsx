import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { startSession } from './auth/session';
import AppRoutes from './routes';

vi.mock('./pages/Login', () => ({
  default: () => <main>Login route</main>,
}));

vi.mock('./pages/Page404', () => ({
  default: () => <main>Not found route</main>,
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
});
