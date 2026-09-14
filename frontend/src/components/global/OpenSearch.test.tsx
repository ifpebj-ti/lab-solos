import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Cookie from 'js-cookie';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OpenSearch from './OpenSearch';

function LocationProbe() {
  const location = useLocation();

  return <output data-testid='location'>{location.pathname}</output>;
}

describe('OpenSearch administrativo', () => {
  afterEach(() => {
    Cookie.remove('doorKey');
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
    Cookie.set('doorKey', 'e30.eyJyb2xlIjoiQWRtaW5pc3RyYWRvciJ9.');
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
