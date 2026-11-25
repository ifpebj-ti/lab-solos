import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_SHORTCUTS } from '@/navigation/profileNavigation';

import Home from './Home';

const mocks = vi.hoisted(() => ({
  readSession: vi.fn(),
}));

vi.mock('@/auth/session', () => ({
  readSession: mocks.readSession,
}));

const profiles = [
  { name: 'Mentor', role: 'Mentor' },
  { name: 'Mentorado', role: 'Mentorado' },
] as const;

describe.each(profiles)('Home de $name', ({ role }) => {
  beforeEach(() => {
    mocks.readSession.mockReturnValue({
      userId: '7',
      role,
      requiresPasswordChange: false,
    });
  });

  afterEach(() => {
  });

  it('exibe somente os atalhos operacionais na ordem do perfil', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText(/Bem-vindo\(a\) ao Laborat/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      PROFILE_SHORTCUTS[role].map((shortcut) => shortcut.to)
    );
    expect(screen.getAllByRole('link').map((link) => link.textContent?.trim())).toEqual(
      PROFILE_SHORTCUTS[role].map((shortcut) => shortcut.label)
    );
    expect(screen.queryByText(/carrossel/i)).not.toBeInTheDocument();
  });
});

describe('Home sem perfil operacional', () => {
  beforeEach(() => {
    mocks.readSession.mockReturnValue({
      userId: '7',
      role: 'Comum',
      requiresPasswordChange: false,
    });
  });

  afterEach(() => {
  });

  it('não cria fallback administrativo para sessão comum ou desconhecida', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
