import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoanHistory from './LoanHistory';

const loansApi = vi.hoisted(() => ({ getLoansById: vi.fn() }));

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const loan = {
  id: 100,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    nomeCompleto: 'Pessoa mentorada',
    email: 'mentorado@example.invalid',
    telefone: null,
  },
  aprovador: null,
  emprestimoProdutos: [
    {
      id: 1,
      emprestimoId: 100,
      produtoId: 301,
      quantidade: 4,
      produto: {
        id: 301,
        nomeProduto: 'Reagente sem lote',
        tipo: 'Químico',
        quantidade: 4,
        loteId: null,
      },
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/mentee/history/loan', state: { id: 100 } }]}>
      <LoanHistory />
    </MemoryRouter>
  );
}

describe('histórico detalhado de empréstimo de mentorado responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getLoansById.mockResolvedValue(loan);
  });

  it('preserva os dados do perfil e os rótulos da lista de produtos', async () => {
    const page = renderPage();

    const linked = await screen.findByRole('list', { name: 'Mentorado vinculado' });
    const products = screen.getByRole('list', { name: 'Produtos selecionados' });

    expect(within(linked).getByText('Pessoa mentorada')).toBeInTheDocument();
    expect(within(linked).getByText('mentorado@example.invalid')).toBeInTheDocument();
    expect(within(linked).getByText('Não informado')).toBeInTheDocument();
    expect(
      Array.from(within(products).getByRole('listitem').querySelectorAll('dt')).map(
        (node) => node.textContent
      )
    ).toEqual(['Código', 'Nome', 'Tipo', 'Quantidade', 'Lote ID']);
    expect(products).toHaveTextContent('Não informado');
    expect(page.container.querySelectorAll('[style*="min-width"]').length).toBe(0);
  });

  it('expõe o carregamento enquanto a consulta está pendente', () => {
    loansApi.getLoansById.mockImplementationOnce(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
  });
});
