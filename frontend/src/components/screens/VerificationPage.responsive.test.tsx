import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VerificationPage from './VerificationPage';

const productApi = vi.hoisted(() => ({
  getProductById: vi.fn(),
  getProductHistoricoSaida: vi.fn(),
}));

vi.mock('@/integration/Product', () => productApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/modals/ProductEditModal', () => ({
  default: () => null,
}));
vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  XAxis: () => null,
  YAxis: () => null,
}));
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

const baseProduct = {
  catmat: 'CAT-1',
  unidadeMedida: 'kg',
  estadoFisico: 1,
  cor: 1,
  odor: 1,
  densidade: 1,
  pesoMolecular: 1,
  grauPureza: 'Alta',
  formulaQuimica: '',
  grupo: 7,
  id: 42,
  nomeProduto: 'Produto de teste',
  fornecedor: 'Fornecedor de teste',
  tipoProduto: 'Vidraria',
  quantidade: 3,
  quantidadeMinima: 1,
  dataFabricacao: null,
  dataValidade: '2027-01-01',
  localizacaoProduto: 'Armário 1',
  status: 1,
  ultimaModificacao: '2026-09-01',
  loteId: 9,
  lote: 'L-9',
  emprestimo: null,
  capacidade: 1,
  altura: 'Alta',
  formato: 'Cilindrica',
  graduada: 'Sim',
  material: 'Vidro',
};

const history = {
  produtoId: 42,
  nomeProduto: 'Produto de teste',
  tipoProduto: 'Vidraria',
  estoqueAtual: 3,
  unidadeMedida: 'kg',
  totalEmprestimos: 2,
  totalQuantidadeEmprestada: 5,
  historico: [
    {
      emprestimoId: 10,
      dataSaida: '2026-09-01T10:00:00',
      unidadeMedida: 'g',
      solicitanteNome: 'Ana Silva',
      dataEmprestimo: '2026-09-01T10:00:00',
      dataDevolucao: null,
      quantidadeEmprestada: 2,
      statusEmprestimo: 'Emprestado',
      solicitante: {
        id: 1,
        nome: 'Ana Silva',
        email: 'ana@example.invalid',
        instituicao: null,
      },
      aprovador: null,
      identificador: 'ID-10',
      lote: null,
    },
    {
      emprestimoId: 11,
      dataSaida: '2026-09-02T10:00:00',
      unidadeMedida: 'mL',
      solicitanteNome: 'Bruno Lima',
      dataEmprestimo: '2026-09-02T10:00:00',
      dataDevolucao: null,
      quantidadeEmprestada: 3,
      statusEmprestimo: 'Devolvido',
      solicitante: {
        id: 2,
        nome: 'Bruno Lima',
        email: 'bruno@example.invalid',
        instituicao: null,
      },
      aprovador: null,
      identificador: 'ID-11',
      lote: 'L-11',
    },
  ],
};

function renderPage(userType: 'admin' | 'mentor' | 'mentee') {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/verification', state: { id: 42 } }]}
    >
      <VerificationPage userType={userType} />
    </MemoryRouter>
  );
}

describe('verificação responsiva de produto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProductById.mockResolvedValue(baseProduct);
    productApi.getProductHistoricoSaida.mockResolvedValue(history);
  });

  it.each([
    ['admin', true, ['Item', 'Fórmula', 'Peso Molecular (g/mol)', 'Marca', 'Grupo', 'Situação']],
    ['mentor', false, ['Item', 'Categoria', 'Situação']],
    ['mentee', true, ['Item', 'Fórmula', 'Peso Molecular (g/mol)', 'Grupo']],
  ] as const)(
    'mantém as colunas do perfil %s na mesma ordem dos valores',
    async (userType, withFormula, labels) => {
      productApi.getProductById.mockResolvedValue({
        ...baseProduct,
        tipoProduto: withFormula ? 'Quimico' : 'Vidraria',
        formulaQuimica: withFormula ? 'H2O' : '',
      });
      renderPage(userType);

      const list = await screen.findByRole('list', {
        name: 'Informações do Produto',
      });
      const record = within(list).getByRole('listitem');
      expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual(labels);
      expect(record).toHaveTextContent('Produto de teste');
      if (withFormula) expect(record).toHaveTextContent('H2O');
      else {
        expect(record).not.toHaveTextContent('H2O');
        expect(record).toHaveTextContent('Cilíndrica');
      }
    }
  );

  it('mantém filtros e associação entre rótulo e valor no histórico do administrador', async () => {
    renderPage('admin');

    const list = await screen.findByRole('list', {
      name: 'Histórico de Movimentações',
    });
    const first = within(list).getAllByRole('listitem')[0];
    expect(
      Array.from(first.querySelectorAll('dt'), (node) => node.textContent)
    ).toEqual(['Data', 'Empréstimo', 'Solicitante', 'Lote', 'Quantidade', 'Unidade']);
    expect(
      Array.from(first.querySelectorAll('dd'), (node) => node.textContent)
    ).toEqual(['01/09/2026', '10', 'Ana Silva', 'Sem lote', '2', 'g']);

    fireEvent.change(screen.getByRole('textbox', { name: 'Pesquisar' }), {
      target: { value: 'Bruno' },
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByRole('listitem')).toHaveTextContent('L-11');
  });

  it.each(['mentor', 'mentee'] as const)('exibe somente o recorte retornado para %s sem presumir nome', async (profile) => {
    productApi.getProductHistoricoSaida.mockResolvedValue({
      produtoId: 42, nomeProduto: 'Produto de teste', tipoProduto: 'Vidraria', unidadeMedida: 'mL',
      historico: [{ emprestimoId: 25, dataSaida: '2026-09-03T10:00:00', quantidadeEmprestada: 1,
        unidadeMedida: 'mL', lote: null, solicitanteNome: null }],
      totalEmprestimos: 1, totalQuantidadeEmprestada: 1,
    });
    renderPage(profile);
    const list = await screen.findByRole('list', { name: 'Histórico de Movimentações' });
    expect(list).toHaveTextContent('03/09/2026');
    expect(list).toHaveTextContent('mL');
    expect(list).not.toHaveTextContent('Ana Silva');
    fireEvent.change(screen.getByRole('textbox', { name: 'Pesquisar' }), { target: { value: '25' } });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  it('omite os dados pessoais legados do histórico do administrador', async () => {
    renderPage('admin');

    await screen.findByRole('list', { name: 'Histórico de Movimentações' });
    const page = screen.getByRole('main');
    expect(page).not.toHaveTextContent('ana@example.invalid');
    expect(page).not.toHaveTextContent('ID-10');
  });

  it.each(['ana@example.invalid', 'ID-10'])(
    'omite o registro ao buscar pelo valor legado %s',
    async (query) => {
      renderPage('admin');
      await screen.findByRole('list', { name: 'Histórico de Movimentações' });

      fireEvent.change(screen.getByRole('textbox', { name: 'Pesquisar' }), {
        target: { value: query },
      });

      expect(
        screen.getByText('Nenhuma movimentação encontrada.')
      ).toBeInTheDocument();
      expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    }
  );

  it('mantém carregamento e estado vazio sem criar uma linha deslocada', () => {
    productApi.getProductById.mockImplementationOnce(() => new Promise(() => {}));
    renderPage('mentor');
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });
});
