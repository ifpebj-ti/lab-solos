import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Cookie from 'js-cookie';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    Cookie.set('doorKey', 'e30.eyJyb2xlIjoiQWRtaW5pc3RyYWRvciJ9.');
  });

  afterEach(() => Cookie.remove('doorKey'));

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
