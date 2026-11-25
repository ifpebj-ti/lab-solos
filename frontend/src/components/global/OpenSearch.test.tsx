import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession, startSession } from '@/auth/session';
import OpenSearch from './OpenSearch';

function LocationProbe() {
  const location = useLocation();

  return <output data-testid='location'>{location.pathname}</output>;
}

describe('OpenSearch administrativo', () => {
  afterEach(() => {
    clearSession();
  });

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    startSession({
      userId: '1',
      role: 'Administrador',
      requiresPasswordChange: false,
      csrfToken: 'test-session-proof',
    });
  });

  it('navega solicitações de cadastros para o destino operacional', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <OpenSearch />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(
      await screen.findByRole('option', { name: /Solicita/ })
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/admin/register-request'
      );
    });
  });
});
