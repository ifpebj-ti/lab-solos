import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
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

const product = {
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
  nomeProduto: 'Produto 42',
  fornecedor: 'Fornecedor',
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
  altura: '1',
  formato: 'Cilíndrico',
  graduada: 'Sim',
  material: 'Vidro',
};

const history = {
  produtoId: 42,
  nomeProduto: 'Produto 42',
  tipoProduto: 'Vidraria',
  estoqueAtual: 3,
  unidadeMedida: 'kg',
  totalEmprestimos: 0,
  totalQuantidadeEmprestada: 0,
  historico: [],
};

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid='location'>
      {JSON.stringify({
        pathname: location.pathname,
        search: location.search,
        state: location.state,
      })}
    </output>
  );
}

function NavigateTo({ path }: { path: string }) {
  const navigate = useNavigate();
  return (
    <button type='button' onClick={() => navigate(path)}>
      Mudar produto
    </button>
  );
}

const renderPage = (
  userType: 'admin' | 'mentor' | 'mentee',
  entry: string | { pathname: string; state?: unknown }
) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <VerificationPage userType={userType} />
      <LocationProbe />
      <NavigateTo path={`/${userType}/verification?id=43`} />
    </MemoryRouter>
  );

describe('VerificationPage: navegação recuperável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProductById.mockResolvedValue(product);
    productApi.getProductHistoricoSaida.mockResolvedValue(history);
  });

  it.each([
    ['admin', '/admin/search-material'],
    ['mentor', '/mentor/search-material'],
    ['mentee', '/mentee/search-material'],
  ] as const)('consulta o produto pelo id da query no perfil %s', async (userType, parent) => {
    renderPage(userType, `/${userType}/verification?id=42`);

    expect(await screen.findByText('Produto 42')).toBeInTheDocument();
    expect(productApi.getProductById).toHaveBeenCalledWith({ id: 42 });
    if (userType === 'admin') {
      expect(productApi.getProductHistoricoSaida).toHaveBeenCalledWith({ id: 42 });
    } else {
      expect(productApi.getProductHistoricoSaida).not.toHaveBeenCalled();
    }
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      parent
    );
  });

  it('normaliza state.id legado antes de consultar', async () => {
    renderPage('mentor', {
      pathname: '/mentor/verification',
      state: { id: 42 },
    });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '"search":"?id=42"'
      );
    });
    expect(await screen.findByText('Produto 42')).toBeInTheDocument();
    expect(productApi.getProductById).toHaveBeenCalledWith({ id: 42 });
  });

  it.each(['', '0', '-1', '1.5', '1e2', 'texto', '2147483648'])(
    'recusa id inválido %s sem requisitar o produto', async (id) => {
      renderPage('admin', `/admin/verification?id=${id}`);

      expect(
        await screen.findByText('Selecione um registro para consultar')
      ).toBeInTheDocument();
      expect(productApi.getProductById).not.toHaveBeenCalled();
      expect(productApi.getProductHistoricoSaida).not.toHaveBeenCalled();
    }
  );

  it('recusa id duplicado sem recorrer ao state legado', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/admin/verification',
            search: '?id=42&id=43',
            state: { id: 42 },
          },
        ]}
      >
        <VerificationPage userType='admin' />
      </MemoryRouter>
    );

    expect(
      await screen.findByText('Selecione um registro para consultar')
    ).toBeInTheDocument();
    expect(productApi.getProductById).not.toHaveBeenCalled();
  });

  it('descarta a resposta de produto de uma URL anterior', async () => {
    let resolveOld: (value: typeof product) => void = () => undefined;
    productApi.getProductById.mockImplementation(({ id }: { id: number }) =>
      id === 42
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve({ ...product, id: 43, nomeProduto: 'Produto 43' })
    );

    renderPage('mentee', '/mentee/verification?id=42');
    await waitFor(() => {
      expect(productApi.getProductById).toHaveBeenCalledWith({ id: 42 });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mudar produto' }));

    expect(await screen.findByText('Produto 43')).toBeInTheDocument();
    resolveOld(product);
    await waitFor(() => {
      expect(screen.queryByText('Produto 42')).not.toBeInTheDocument();
    });
  });
});
