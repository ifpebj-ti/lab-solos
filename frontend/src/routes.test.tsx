import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
});
