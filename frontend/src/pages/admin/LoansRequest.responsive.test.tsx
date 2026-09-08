import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoansRequest from './LoansRequest';

const loansApi = vi.hoisted(() => ({
  getAllLoans: vi.fn(),
  approveLoan: vi.fn(),
  rejectLoan: vi.fn(),
}));

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({ default: () => null }));

const loans = [
  {
    id: 71,
    dataRealizacao: '2026-09-01T10:00:00',
    dataDevolucao: '2026-09-08T10:00:00',
    dataAprovacao: null,
    status: 'Pendente',
    emprestimoProdutos: [],
    solicitanteId: 501,
    solicitante: {
      id: 501,
      nomeCompleto: 'Ana Silva',
      email: 'ana@example.invalid',
    },
    aprovadorId: null,
    aprovador: null,
  },
  {
    id: 72,
    dataRealizacao: '2026-09-02T10:00:00',
    dataDevolucao: '2026-09-09T10:00:00',
    dataAprovacao: null,
    status: 'Pendente',
    emprestimoProdutos: [],
    solicitanteId: 502,
    solicitante: {
      id: 502,
      nomeCompleto: 'Bruno Souza',
      email: 'bruno@example.invalid',
    },
    aprovadorId: null,
    aprovador: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <LoansRequest />
    </MemoryRouter>
  );
}

describe('solicitacoes de emprestimo responsivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getAllLoans.mockResolvedValue(loans);
    loansApi.approveLoan.mockResolvedValue(undefined);
    loansApi.rejectLoan.mockResolvedValue(undefined);
  });

  it('renderiza dados, rotulos e nomes das acoes no mesmo registro', async () => {
    renderPage();

    const list = await screen.findByRole('list', {
      name: 'Solicitações de empréstimo',
    });
    const records = Array.from(list.querySelectorAll('[role="listitem"]'));
    expect(records).toHaveLength(2);
    expect(
      Array.from(records[0].querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['Data de solicitação', 'Nome', 'Email', 'Ações']);
    expect(records[0]).toHaveTextContent('Ana Silva');
    expect(records[0]).toHaveTextContent('ana@example.invalid');
    expect(screen.getByRole('link', { name: /01\/09\/2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recusar Ana Silva' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar Ana Silva' })).toBeInTheDocument();
  });

  it('envia o id correto em cada acao e atualiza a lista', async () => {
    renderPage();
    await screen.findByText('Ana Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Recusar Ana Silva' }));
    await waitFor(() => expect(loansApi.rejectLoan).toHaveBeenCalledWith(71));
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar Bruno Souza' }));
    await waitFor(() => expect(loansApi.approveLoan).toHaveBeenCalledWith(72));

    expect(loansApi.rejectLoan).toHaveBeenCalledTimes(1);
    expect(loansApi.approveLoan).toHaveBeenCalledTimes(1);
    expect(loansApi.getAllLoans).toHaveBeenCalledTimes(3);
  });

  it('mantem carregamento acessivel e apresenta erro apos falha da consulta', async () => {
    let rejectRequest!: (reason: Error) => void;
    loansApi.getAllLoans.mockImplementationOnce(
      () => new Promise((_, reject) => { rejectRequest = reject; })
    );

    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
    rejectRequest(new Error('Falha sintetica'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os empréstimos'
    );
    expect(
      screen.queryByText('Nenhuma solicitação de empréstimo pendente.')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
