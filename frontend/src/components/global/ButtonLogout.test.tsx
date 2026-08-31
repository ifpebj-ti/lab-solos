import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { clearSession } from '@/auth/session';
import ButtonLogout from './ButtonLogout';

vi.mock('@/auth/session', () => ({
  clearSession: vi.fn(),
}));

function CurrentPath() {
  return <output aria-label='rota atual'>{useLocation().pathname}</output>;
}

describe('ButtonLogout', () => {
  it('limpa a sessao antes de navegar para o login', () => {
    render(
      <MemoryRouter initialEntries={['/admin/home']}>
        <ButtonLogout />
        <CurrentPath />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link'));

    expect(clearSession).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('rota atual')).toHaveTextContent('/');
  });
});
