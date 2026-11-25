import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_SHORTCUTS } from '@/navigation/profileNavigation';

import Home from './Home';
import AdminHome from './admin/Home';

const mocks = vi.hoisted(() => ({
  readSession: vi.fn(),
  getDependentesForApproval: vi.fn(),
  getAllLoans: vi.fn(),
  getAlertProducts: vi.fn(),
}));

vi.mock('@/auth/session', () => ({
  readSession: mocks.readSession,
}));

vi.mock('@/integration/Class', () => ({
  getDependentesForApproval: mocks.getDependentesForApproval,
}));

vi.mock('@/integration/Loans', () => ({
  getAllLoans: mocks.getAllLoans,
}));

vi.mock('@/integration/Product', () => ({
  getAlertProducts: mocks.getAlertProducts,
}));

describe('publicação das Homes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readSession.mockReturnValue({
      token: 'session-token',
      userId: '7',
      role: 'Mentor',
      requiresPasswordChange: false,
    });
  });

  it('mantém os atalhos do perfil sem publicar indicadores operacionais', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      PROFILE_SHORTCUTS.Mentor.map((shortcut) => shortcut.to)
    );
    expect(screen.queryByText('Pendências para análise')).not.toBeInTheDocument();
    expect(screen.queryByText(/Tipos de (Vidrarias|Químicos|Outros)/)).not.toBeInTheDocument();
    expect(mocks.getDependentesForApproval).not.toHaveBeenCalled();
    expect(mocks.getAllLoans).not.toHaveBeenCalled();
    expect(mocks.getAlertProducts).not.toHaveBeenCalled();
  });

  it('reserva os indicadores de pendências ao administrador e mostra erros sem detalhes internos', async () => {
    mocks.readSession.mockReturnValue({
      token: 'session-token',
      userId: '7',
      role: 'Administrador',
      requiresPasswordChange: false,
    });
    mocks.getDependentesForApproval.mockRejectedValue(
      new Error('segredo interno do servidor')
    );
    mocks.getAllLoans.mockRejectedValue(new Error('segredo interno do servidor'));
    mocks.getAlertProducts.mockRejectedValue(
      new Error('segredo interno do servidor')
    );

    render(
      <MemoryRouter>
        <AdminHome />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('alert')).toHaveLength(3);
    });

    expect(mocks.getDependentesForApproval).toHaveBeenCalledWith('7');
    expect(mocks.getAllLoans).toHaveBeenCalledOnce();
    expect(mocks.getAlertProducts).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Pendências para análise' })).toBeInTheDocument();
    expect(screen.getAllByText('Não foi possível concluir a operação.')).toHaveLength(3);
    expect(screen.queryByText(/segredo interno do servidor/)).not.toBeInTheDocument();
  });
});
