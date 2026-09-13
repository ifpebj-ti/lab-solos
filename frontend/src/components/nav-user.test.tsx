import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { clearSession } from '@/auth/session';
import { NavUser } from './nav-user';
import { SidebarProvider } from './ui/sidebar';

vi.mock('@/auth/session', () => ({
  clearSession: vi.fn(),
}));

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}</output>;
}

function renderNavUser(nivelUsuario?: string) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <SidebarProvider>
        <NavUser
          user={{
            name: 'Usuário Sintético',
            email: 'usuario@example.test',
            nivelUsuario,
          }}
        />
      </SidebarProvider>
      <LocationDisplay />
    </MemoryRouter>
  );
}

function openUserMenu() {
  const trigger = screen.getByRole('button', { name: /Usuário Sintético/i });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter' });
}

describe('NavUser', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it.each([
    ['Administrador', '/admin/profile'],
    ['Mentor', '/mentor/profile'],
    ['Mentorado', '/mentee/profile'],
  ])(
    'mantém Conta operacional para %s e remove promessas futuras',
    (nivelUsuario, profileRoute) => {
      renderNavUser(nivelUsuario);

      openUserMenu();

      expect(screen.queryByText(/Labon Pro/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/em breve/i)).not.toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Conta' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
      expect(screen.getAllByRole('separator')).toHaveLength(2);

      fireEvent.click(screen.getByRole('menuitem', { name: 'Conta' }));

      expect(screen.getByTestId('location')).toHaveTextContent(profileRoute);
    }
  );

  it('mantém somente Sair para Comum e centraliza a limpeza da sessão', () => {
    renderNavUser('Comum');

    openUserMenu();

    expect(screen.queryByRole('menuitem', { name: 'Conta' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Labon Pro/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    expect(screen.getAllByRole('separator')).toHaveLength(1);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(clearSession).toHaveBeenCalledOnce();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
