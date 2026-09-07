import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoanHistories from './LoanHistories';

const classApi = vi.hoisted(() => ({ getLoansByDependentes: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({
  default: ({ title, number }: { title: string; number: string }) => (
    <div aria-label={title}>{number}</div>
  ),
}));

const loans = [
  {
    id: 101,
    dataRealizacao: '2026-09-01T10:00:00',
    dataDevolucao: '',
    dataAprovacao: '',
    status: 'devolvido',
    produtos: [{ id: 1 }],
    solicitanteId: 1,
    solicitante: { nomeCompleto: 'Ana Silva' },
    aprovadorId: 2,
    aprovador: { nomeCompleto: 'Mentor' },
  },
  {
    id: 102,
    dataRealizacao: '2026-09-02T10:00:00',
    dataDevolucao: '',
    dataAprovacao: '',
    status: 'não devolvido',
    produtos: [{ id: 1 }, { id: 2 }],
    solicitanteId: 3,
    solicitante: { nomeCompleto: 'Bruno Lima' },
    aprovadorId: 2,
    aprovador: { nomeCompleto: 'Mentor' },
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/loan/histories']}>
      <LoanHistories />
    </MemoryRouter>
  );
}

describe('histórico geral responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getLoansByDependentes.mockResolvedValue(loans);
  });

  it('mantém todos os campos no rótulo correspondente em cada registro', async () => {
    renderPage();

    const list = await screen.findByRole('list', {
      name: 'Histórico de Empréstimos',
    });
    const records = within(list).getAllByRole('listitem');
    expect(records).toHaveLength(2);
    expect(Array.from(records[0].querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Id',
      'Mentorado Vinculado',
      'Data',
      'Itens Utilizados',
      'Status',
    ]);
    expect(records[0]).toHaveTextContent('101');
    expect(records[0]).toHaveTextContent('Ana Silva');
    expect(records[0]).toHaveTextContent('1');
    expect(records[1]).toHaveTextContent('Bruno Lima');
    expect(records[1]).toHaveTextContent('2');
  });

  it('preserva filtro, ordenação e estado vazio', async () => {
    renderPage();
    const list = await screen.findByRole('list', {
      name: 'Histórico de Empréstimos',
    });
    const search = screen.getByRole('textbox', { name: 'Pesquisar' });
    fireEvent.change(search, { target: { value: 'Bruno' } });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByRole('listitem')).toHaveTextContent('102');

    fireEvent.change(search, { target: { value: 'inexistente' } });
    expect(screen.getByText('Nenhum dado disponível para exibição.')).toBeInTheDocument();
  });

  it('expõe carregamento enquanto a consulta está pendente', () => {
    classApi.getLoansByDependentes.mockImplementationOnce(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });
});
