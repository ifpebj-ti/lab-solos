import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession, startSession } from '@/auth/session';
import OpenSearch from './OpenSearch';

describe('OpenSearch navigation contract', () => {
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

  afterEach(() => clearSession());

  it('has an accessible trigger and returns focus after closing', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <OpenSearch />
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: 'Pesquisar rotas' });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
