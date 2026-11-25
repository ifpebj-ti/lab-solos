import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import SearchMaterialComponent from './SearchMaterialComponent';
import {
  getAdminProductCatalog,
  getAllProducts,
  type ProductAlertReason,
} from '@/integration/Product';
import { getSystemQuantities } from '@/integration/System';
import { AxiosHeaders } from 'axios';

vi.mock('@/integration/Product', () => ({
  getAdminProductCatalog: vi.fn(),
  getAllProducts: vi.fn(),
}));
vi.mock('@/integration/System', () => ({ getSystemQuantities: vi.fn() }));
vi.mock('../global/OpenSearch', () => ({ default: () => null }));
vi.mock('../global/inputs/SelectInput', () => ({
  default: ({ onValueChange }: { onValueChange: (value: string) => void }) => (
    <select
      aria-label='Tipo'
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value='todos'>Todos</option>
      <option value='Vidraria'>Vidrarias</option>
    </select>
  ),
}));

const products = Array.from({ length: 8 }, (_, index) => ({
  id: index + 101,
  nomeProduto: `Produto ${index + 1}`,
  tipoProduto: index === 0 ? 'Vidraria' : 'Quimico',
  quantidade: 3,
  quantidadeMinima: 1,
  unidadeMedida: 'ml',
  status: 'Disponivel',
}));
const adminProducts = (
  items: Array<
    (typeof products)[number] & {
      capacidadeMl?: number | null;
      motivosAlerta?: ProductAlertReason[];
    }
  > = products
) =>
  items.map((product) => ({
    id: product.id,
    catmat: '',
    nomeProduto: product.nomeProduto,
    tipoProduto: product.tipoProduto,
    fornecedor: null,
    unidadeMedida: product.unidadeMedida,
    quantidade: product.quantidade,
    quantidadeMinima: 0,
    localizacaoProduto: null,
    dataFabricacao: null,
    dataValidade: null,
    ultimaModificacao: '',
    status: product.status,
    lote: null,
    capacidadeMl: product.capacidadeMl ?? null,
    motivosAlerta: product.motivosAlerta ?? [],
  }));
function Location() {
  const location = useLocation();
  return (
    <output data-testid='location'>
      {JSON.stringify({
        path: location.pathname,
        search: location.search,
        state: location.state,
      })}
    </output>
  );
}
const mount = (userType: 'admin' | 'mentor' | 'mentee' = 'admin') =>
  render(
    <MemoryRouter>
      <SearchMaterialComponent
        userType={userType}
        destinationRoute={`/${userType}/verification`}
      />
      <Location />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAllProducts).mockResolvedValue(products);
  vi.mocked(getAdminProductCatalog).mockResolvedValue(adminProducts());
  vi.mocked(getSystemQuantities).mockResolvedValue({
    data: {
      produtos: { Quimico: 0, Vidraria: 0, Outro: 0, Total: 0 },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
});

describe('produtos: contratos existentes', () => {
  it.each(['admin', 'mentor', 'mentee'] as const)(
    'preserva sete registros, filtros, ordem e destino no perfil %s',
    async (profile) => {
      mount(profile);
      await screen.findByText('Produto 1');
      expect(screen.queryByText('Produto 8')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^(Página )?2$/ }));
      expect(screen.getByText('Produto 8')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^(Página )?1$/ }));
      const search = screen.getByRole('textbox');
      fireEvent.change(search, { target: { value: 'Produto 2' } });
      expect(screen.queryByText('Produto 1')).not.toBeInTheDocument();
      fireEvent.change(search, { target: { value: '' } });
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'Vidraria' },
      });
      expect(screen.getByText('Produto 1')).toBeInTheDocument();
      expect(screen.queryByText('Produto 2')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Produto 1'));
      expect(screen.getByTestId('location')).toHaveTextContent(
        JSON.stringify({
          path: `/${profile}/verification`,
          search: '?id=101',
          state: { id: 101 },
        })
      );
      if (profile === 'admin') {
        expect(getAdminProductCatalog).toHaveBeenCalledTimes(1);
        expect(getAllProducts).not.toHaveBeenCalled();
      } else {
        expect(getAllProducts).toHaveBeenCalledTimes(1);
        expect(getAdminProductCatalog).not.toHaveBeenCalled();
      }
    }
  );
});

describe('indicação administrativa de alertas', () => {
  describe.each([
    ['preenchida', products],
    ['vazia', []],
  ] as const)('consulta %s', (_state, result) => {
    it.each(['admin', 'mentor', 'mentee'] as const)(
      'exibe o indicador permanente somente no perfil administrativo: %s',
      async (profile) => {
        if (profile === 'admin') {
          vi.mocked(getAdminProductCatalog).mockResolvedValue(
            adminProducts([...result])
          );
        } else {
          vi.mocked(getAllProducts).mockResolvedValue([...result]);
        }
        mount(profile);
        await screen.findByRole('list', { name: 'Produtos' });

        const indicator = screen.queryByRole('img', {
          name: 'Alertas de produtos',
        });
        if (profile === 'admin') {
          expect(indicator).toBeVisible();
          expect(indicator).toHaveTextContent('Alertas de produtos');
          expect(indicator?.querySelector('svg')).toBeInTheDocument();
        } else {
          expect(indicator).not.toBeInTheDocument();
        }
        if (profile === 'admin' && result.length > 0) {
          expect(screen.getAllByText('Sem alerta').length).toBeGreaterThan(0);
        } else {
          expect(screen.queryByText('Sem alerta')).not.toBeInTheDocument();
        }
        expect(
          screen.queryByText('Estoque abaixo do mínimo')
        ).not.toBeInTheDocument();
      }
    );
  });
});

describe('produtos responsivos', () => {
  it.each([
    ['admin', 'unidade', 'unidades'],
    ['mentor', 'l', 'l'],
    ['mentee', 'l', 'l'],
  ] as const)(
    'exibe a quantidade e a unidade de cada produto no perfil %s',
    async (profile, singular, plural) => {
      const listing = [
        { tipoProduto: 'Vidraria', quantidade: 1, unidadeMedida: 'l' },
        { tipoProduto: 'Vidraria', quantidade: 4, unidadeMedida: 'l' },
        { tipoProduto: 'Vidraria', quantidade: 0, unidadeMedida: 'l' },
        { tipoProduto: 'Quimico', quantidade: 2, unidadeMedida: 'l' },
        { tipoProduto: 'Outro', quantidade: 5, unidadeMedida: 'kg' },
      ];
      const result = listing.map((product, index) => ({
        ...products[index],
        ...product,
      }));
      if (profile === 'admin') {
        vi.mocked(getAdminProductCatalog).mockResolvedValue(
          adminProducts(result)
        );
      } else {
        vi.mocked(getAllProducts).mockResolvedValue(result);
      }
      mount(profile);

      const list = await screen.findByRole('list', { name: 'Produtos' });
      const rows = within(list).getAllByRole('listitem');
      expect(
        rows.map((row) => [
          within(row).getByText('Quantidade').nextElementSibling?.textContent,
          within(row).getByText('Unidade').nextElementSibling?.textContent,
        ])
      ).toEqual([
        ['1', singular],
        ['4', plural],
        ['0', plural],
        ['2', 'l'],
        ['5', 'kg'],
      ]);
    }
  );

  it('associa os seis valores a rótulos e oferece link nativo', async () => {
    mount();
    await screen.findByText('Produto 1');
    const list = screen.getByRole('list', { name: 'Produtos' });
    const first = within(list).getAllByRole('listitem')[0];
    expect(
      Array.from(first.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual([
      'ID',
      'Nome',
      'Tipo',
      'Quantidade',
      'Unidade',
      'Status',
      'Alertas',
    ]);
    expect(
      Array.from(first.querySelectorAll('dd')).map((node) => node.textContent)
    ).toEqual([
      '101',
      'Produto 1',
      'Vidraria',
      '3',
      'unidades',
      'Disponivel',
      'Sem alerta',
    ]);
    expect(within(first).getByRole('link', { name: '101' })).toHaveAttribute(
      'href',
      '/admin/verification?id=101'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inverter ordem' }));
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent(
      'Produto 8'
    );
  });
  it('mantém carregamento e vazio após falha de consulta', async () => {
    vi.mocked(getAdminProductCatalog).mockRejectedValue(
      new Error('Falha sintética')
    );
    mount();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhum dado disponível para exibição.')
    ).toBeInTheDocument();
  });

  it('indexa nome, categoria, quantidade, unidade e status no campo de busca', async () => {
    mount();
    await screen.findByText('Produto 1');

    const search = screen.getByRole('textbox');
    fireEvent.change(search, { target: { value: 'unidades' } });
    expect(screen.getByText('Produto 1')).toBeInTheDocument();
    expect(screen.queryByText('Produto 2')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'ml' } });
    expect(screen.getByText('Produto 2')).toBeInTheDocument();
    expect(screen.queryByText('Produto 1')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'Disponivel' } });
    expect(screen.getByText('Produto 1')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '3' } });
    expect(screen.getByText('Produto 1')).toBeInTheDocument();
  });

  it('mantém produtos e diferencia falha dos indicadores do sistema', async () => {
    vi.mocked(getSystemQuantities).mockRejectedValue(new Error('Falha nos indicadores'));
    mount();

    await screen.findByText('Produto 1');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'carregar os indicadores do sistema'
    );
    expect(screen.getAllByText('+—')).toHaveLength(3);
  });

  it('mantém container e busca do catálogo em superfícies tokenizadas', async () => {
    mount();
    await screen.findByText('Produto 1');

    const products = screen.getByRole('list', { name: 'Produtos' });
    const catalogSurface = products.closest('div.mt-10');
    const search = screen.getByRole('textbox', { name: 'Pesquisar' });
    const searchSurface = search.parentElement;

    expect(catalogSurface).toHaveClass('bg-surface', 'border-borderMy');
    expect(catalogSurface).not.toHaveClass('bg-white');
    expect(searchSurface).toHaveClass('bg-surface', 'border-borderMy');
    expect(searchSurface).not.toHaveClass('bg-white');
  });

  const alertCatalog = adminProducts([
      {
        ...products[0],
        nomeProduto: 'Béquer',
        tipoProduto: 'Vidraria',
        capacidadeMl: 250,
        motivosAlerta: [],
      },
      {
        ...products[1],
        nomeProduto: 'Béquer',
        tipoProduto: 'Vidraria',
        capacidadeMl: 500,
        motivosAlerta: ['estoque_abaixo_minimo'] as ProductAlertReason[],
      },
      {
        ...products[2],
        nomeProduto: 'Pipeta',
        tipoProduto: 'Vidraria',
        capacidadeMl: null,
        motivosAlerta: ['validade'] as ProductAlertReason[],
      },
      {
        ...products[3],
        nomeProduto: 'Balão',
        tipoProduto: 'Vidraria',
        capacidadeMl: 1000,
        motivosAlerta: [
          'estoque_abaixo_minimo',
          'validade',
        ] as ProductAlertReason[],
      },
  ]);

  it('mostra os motivos independentes e a capacidade no catálogo administrativo', async () => {
    const adminCatalog = alertCatalog;
    vi.mocked(getAdminProductCatalog).mockResolvedValue(adminCatalog);
    mount('admin');

    const list = await screen.findByRole('list', { name: 'Produtos' });
    const rows = within(list).getAllByRole('listitem');
    expect(
      rows.map(
        (row) =>
          within(row).getByText('Nome').nextElementSibling?.textContent
      )
    ).toEqual(['Béquer 250 ml', 'Béquer 500 ml', 'Pipeta', 'Balão 1000 ml']);
    expect(
      rows.map(
        (row) =>
          within(row).getByText('Alertas').nextElementSibling?.textContent
      )
    ).toEqual([
      'Sem alerta',
      'Estoque abaixo do mínimo',
      'Validade',
      'Estoque abaixo do mínimo; Validade',
    ]);
  });

  it.each(['mentor', 'mentee'] as const)(
    'mantém o catálogo do perfil %s sem os dados administrativos',
    async (profile) => {
      vi.mocked(getAllProducts).mockResolvedValue(alertCatalog);
      mount(profile);

      const list = await screen.findByRole('list', { name: 'Produtos' });
      const rows = within(list).getAllByRole('listitem');
      expect(
        rows.map(
          (row) => within(row).getByText('Nome').nextElementSibling?.textContent
        )
      ).toEqual(['Béquer', 'Béquer', 'Pipeta', 'Balão']);
      expect(rows[0].querySelector('dt')).toHaveTextContent('ID');
      expect(
        Array.from(rows[0].querySelectorAll('dt')).map(
          (node) => node.textContent
        )
      ).not.toContain('Alertas');
      expect(screen.queryByText('Estoque abaixo do mínimo')).not.toBeInTheDocument();
      expect(screen.queryByText('Validade')).not.toBeInTheDocument();
    }
  );
});
