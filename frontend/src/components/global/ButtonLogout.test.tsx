import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { logoutSession } from '@/integration/Auth';
import ButtonLogout from './ButtonLogout';

vi.mock('@/integration/Auth', () => ({
  logoutSession: vi.fn(),
}));

function CurrentPath() {
  return <output aria-label='rota atual'>{useLocation().pathname}</output>;
}

describe('ButtonLogout', () => {
  it('revoga a sessao antes de navegar para o login', async () => {
    vi.mocked(logoutSession).mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={['/admin/home']}>
        <ButtonLogout />
        <CurrentPath />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(logoutSession).toHaveBeenCalledOnce();
      expect(screen.getByLabelText('rota atual')).toHaveTextContent('/');
    });
  });
});
