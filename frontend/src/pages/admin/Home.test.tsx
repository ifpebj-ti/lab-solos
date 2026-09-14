import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_SHORTCUTS } from '@/navigation/profileNavigation';

import Home from './Home';

const mocks = vi.hoisted(() => ({
  getDependentesForApproval: vi.fn(),
  getAllLoans: vi.fn(),
  getAlertProducts: vi.fn(),
  readSession: vi.fn(),
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

vi.mock('@/auth/session', () => ({
  readSession: mocks.readSession,
}));

describe('Home administrativa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readSession.mockReturnValue({
      token: 'session-token',
      userId: '7',
      role: 'Administrador',
      requiresPasswordChange: false,
    });
    mocks.getDependentesForApproval.mockResolvedValue([]);
    mocks.getAllLoans.mockResolvedValue([]);
    mocks.getAlertProducts.mockResolvedValue([]);
  });

  it('renderiza os seis atalhos administrativos na ordem do catálogo', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
        PROFILE_SHORTCUTS.Administrador.map((shortcut) => shortcut.to)
      );
    });
  });

  it('mantém atalhos e resultados independentes quando uma consulta falha', async () => {
    const retryableError = {
      name: 'ApplicationError',
      category: 'network',
      message: 'Falha de rede',
      retryable: true,
    };
    mocks.getDependentesForApproval.mockRejectedValue(retryableError);
    mocks.getAllLoans.mockResolvedValue([{ status: 'Pendente' }]);
    mocks.getAlertProducts.mockResolvedValue([{ id: 3 }]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });

    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('link', { name: /Solicitações de empréstimo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alertas de produtos/i })).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);
  });

  it('repete somente a leitura que falhou', async () => {
    const retryableError = {
      name: 'ApplicationError',
      category: 'network',
      message: 'Falha de rede',
      retryable: true,
    };
    mocks.getDependentesForApproval
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce([{ id: 9 }]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const retryButton = await screen.findByRole('button', {
      name: 'Tentar novamente',
    });
    retryButton.click();

    await waitFor(() => {
      expect(mocks.getDependentesForApproval).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('link', { name: /Solicitações de cadastro/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Home administrativa sem perfil administrativo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('não renderiza atalhos administrativos para perfil comum', () => {
    mocks.readSession.mockReturnValue({
      token: 'session-token',
      userId: '7',
      role: 'Comum',
      requiresPasswordChange: false,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(mocks.getDependentesForApproval).not.toHaveBeenCalled();
  });
});
