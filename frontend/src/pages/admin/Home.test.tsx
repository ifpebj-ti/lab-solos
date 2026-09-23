import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_SHORTCUTS } from '@/navigation/profileNavigation';

import Home from './Home';

const mocks = vi.hoisted(() => ({
  getDependentesForApproval: vi.fn(),
  getAllLoans: vi.fn(),
  getAlertProducts: vi.fn(),
  readSession: vi.fn(),
}));

const registrationRequest = {
  id: 11,
  nomeCompleto: 'Marina de Souza',
  email: 'marina@example.test',
  telefone: null,
  dataIngresso: '2026-09-22',
  status: 'Pendente',
  nivelUsuario: 'Mentorado',
  cidade: 'Recife',
  curso: 'Química',
  instituicao: 'IFPEBJ',
};

const loanRequest = {
  id: 701,
  dataRealizacao: '2026-09-22T10:00:00Z',
  dataPrevistaDevolucao: null,
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [
    {
      emprestimoId: 701,
      quantidade: 2,
      produto: {
        id: 91,
        catmat: 'CAT-91',
        nomeProduto: 'Reagente de bancada',
        tipoProduto: 'Químico',
        fornecedor: null,
        unidadeMedida: 'mL',
        quantidade: 8,
        quantidadeMinima: 1,
        localizacaoProduto: 'Armário A',
        dataFabricacao: null,
        dataValidade: null,
        ultimaModificacao: '2026-09-22T10:00:00Z',
        status: 'Disponível',
        lote: null,
      },
    },
  ],
  solicitante: {
    id: 7,
    nomeCompleto: 'João da Silva',
    email: 'joao@example.test',
    telefone: null,
    dataIngresso: '2026-01-01',
    status: 'Habilitado',
    nivelUsuario: 'Mentor',
    tipoUsuario: 'Academico',
    responsavel: null,
    cidade: 'Recife',
    curso: 'Agronomia',
    instituicao: 'IFPEBJ',
  },
  aprovador: null,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location-search'>{location.search}</output>;
}

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

  it('mantém pendências reais e falhas independentes no espaço de análise', async () => {
    const retryableError = {
      name: 'ApplicationError',
      category: 'network',
      message: 'Falha de rede',
      retryable: true,
    };
    mocks.getDependentesForApproval.mockRejectedValue(retryableError);
    mocks.getAllLoans.mockResolvedValue([loanRequest]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /solicita.*701/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Falha de rede/i);
    expect(screen.getByText('Nenhuma solicitação de cadastro disponível.')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('preserva parâmetros ao validar a seleção e navega para a análise existente', async () => {
    mocks.getDependentesForApproval.mockResolvedValue([registrationRequest]);
    mocks.getAllLoans.mockResolvedValue([loanRequest]);

    render(
      <MemoryRouter initialEntries={['/admin?context=lab&filter=pendentes']}>
        <Home />
        <LocationProbe />
      </MemoryRouter>
    );

    const registration = await screen.findByRole('button', {
      name: /solicitação de cadastro.*Marina/i,
    });
    fireEvent.click(registration);

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'context=lab&filter=pendentes&id=11'
      );
    });

    expect(
      screen.getByRole('link', { name: 'Analisar solicitação' })
    ).toHaveAttribute('href', '/admin/register-request?id=11');
  });

  it('não troca o detalhe selecionado quando as respostas chegam fora de ordem', async () => {
    let resolveApproval!: (value: typeof registrationRequest[]) => void;
    let resolveLoans!: (value: typeof loanRequest[]) => void;
    mocks.getDependentesForApproval.mockImplementation(
      () => new Promise((resolve) => {
        resolveApproval = resolve;
      })
    );
    mocks.getAllLoans.mockImplementation(
      () => new Promise((resolve) => {
        resolveLoans = resolve;
      })
    );

    render(
      <MemoryRouter initialEntries={['/admin?context=lab&id=701']}>
        <Home />
      </MemoryRouter>
    );

    await act(async () => {
      resolveLoans([loanRequest]);
    });
    expect(await screen.findByText('Solicitação de empréstimo')).toBeInTheDocument();

    await act(async () => {
      resolveApproval([registrationRequest]);
    });
    expect(screen.getByText('Solicitação de empréstimo')).toBeInTheDocument();
    expect(screen.queryByText('Marina de Souza')).not.toBeInTheDocument();
  });

  it.each([
    ['inválido', '?view=pendencias&id=abc', 'O ID selecionado é inválido.'],
    ['indisponível', '?view=pendencias&id=999', 'Esta pendência não está disponível.'],
  ])('explica quando o ID está %s', async (_label, search, message) => {
    mocks.getDependentesForApproval.mockResolvedValue([registrationRequest]);
    mocks.getAllLoans.mockResolvedValue([loanRequest]);

    render(
      <MemoryRouter initialEntries={[`/admin${search}`]}>
        <Home />
      </MemoryRouter>
    );

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Analisar solicitação' })).not.toBeInTheDocument();
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
