import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import type {
  AdminProductCatalogItem,
  ProductAlertReason,
} from '@/integration/Product';

import FollowUp from './FollowUp';

const productApi = vi.hoisted(() => ({ getAdminProductCatalog: vi.fn() }));

vi.mock('@/integration/Product', () => productApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/global/inputs/SelectInput', () => ({
  default: ({
    options,
    onValueChange,
    value,
  }: {
    options: { value: string; label: string }[];
    onValueChange: (value: string) => void;
    value: string;
  }) => (
    <select
      aria-label='Filtro de alertas'
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const product = (
  id: number,
  nomeProduto: string,
  motivosAlerta: ProductAlertReason[]
): AdminProductCatalogItem => ({
  id,
  catmat: `CAT-${id}`,
  nomeProduto,
  tipoProduto: 'Químico',
  fornecedor: 'Fornecedor',
  unidadeMedida: 'Litro',
  quantidade: 2,
  quantidadeMinima: 8,
  localizacaoProduto: 'Armário',
  dataFabricacao: null,
  dataValidade: null,
  ultimaModificacao: '2026-11-19T10:00:00Z',
  status: 'Disponível',
  lote: null,
  capacidadeMl: null,
  motivosAlerta,
});

const catalog: AdminProductCatalogItem[] = [
  product(91, 'Produto somente em estoque', ['estoque_abaixo_minimo']),
  product(92, 'Produto somente em validade', ['validade']),
  product(93, 'Produto com os dois motivos', ['validade']),
  product(93, 'Produto com os dois motivos', [
    'estoque_abaixo_minimo',
    'validade',
  ]),
  product(94, 'Produto sem alerta', []),
];

describe('acompanhamento responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getAdminProductCatalog.mockResolvedValue(catalog);
  });

  it('associa todos os campos do alerta a rótulos e preserva o destino', async () => {
    productApi.getAdminProductCatalog.mockResolvedValue([
      product(91, 'Produto com nome muito longo sem espaços ' + 'A'.repeat(80), [
        'estoque_abaixo_minimo',
      ]),
    ]);
    render(
      <MemoryRouter>
        <FollowUp />
      </MemoryRouter>
    );

    const list = await screen.findByRole('list', { name: 'Produtos em alerta' });
    const record = within(list).getByRole('listitem');

    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Nome',
      'Quantidade Atual',
      'Quantidade Mínima',
      'Data de Validade',
      'Status',
    ]);
    expect(record).toHaveTextContent('2 litros');
    expect(record).toHaveTextContent('8 litros');
    expect(within(record).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/verification?id=91'
    );
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/search-material'
    );
  });

  it('deduplica a união por ID, filtra cada motivo e conta os produtos distintos', async () => {
    render(
      <MemoryRouter>
        <FollowUp />
      </MemoryRouter>
    );

    const list = await screen.findByRole('list', { name: 'Produtos em alerta' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('Produto com os dois motivos')).toBeInTheDocument();
    expect(within(list).queryByText('Produto sem alerta')).not.toBeInTheDocument();

    const cards = screen.getAllByRole('article');
    expect(cards[0]).toHaveTextContent('Produtos com Alertas+3');
    expect(cards[1]).toHaveTextContent('Produtos com Alerta de Validade+2');
    expect(cards[2]).toHaveTextContent('Produtos com Alerta de Estoque+2');

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtro de alertas' }), {
      target: { value: 'validade' },
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Produto somente em validade')).toBeInTheDocument();
    expect(within(list).getByText('Produto com os dois motivos')).toBeInTheDocument();
    expect(within(list).queryByText('Produto somente em estoque')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtro de alertas' }), {
      target: { value: 'estoque_abaixo_minimo' },
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Produto somente em estoque')).toBeInTheDocument();
    expect(within(list).getByText('Produto com os dois motivos')).toBeInTheDocument();
    expect(within(list).queryByText('Produto somente em validade')).not.toBeInTheDocument();
  });

  it('apresenta estado vazio para busca sem correspondência', async () => {
    render(
      <MemoryRouter>
        <FollowUp />
      </MemoryRouter>
    );

    const list = await screen.findByRole('list', { name: 'Produtos em alerta' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Pesquisar' }), {
      target: { value: 'sem-correspondência' },
    });

    expect(within(list).queryAllByRole('listitem')).toHaveLength(0);
    expect(
      screen.getByText('Nenhum produto encontrado para os filtros aplicados.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Produto com os dois motivos')).not.toBeInTheDocument();
  });

  it('volta à primeira página ao trocar para um filtro com poucos resultados', async () => {
    productApi.getAdminProductCatalog.mockResolvedValue([
      ...Array.from({ length: 8 }, (_, index) =>
        product(index + 101, `Produto de estoque ${index + 1}`, [
          'estoque_abaixo_minimo',
        ])
      ),
      product(109, 'Único produto de validade', ['validade']),
    ]);

    render(
      <MemoryRouter>
        <FollowUp />
      </MemoryRouter>
    );

    const list = await screen.findByRole('list', { name: 'Produtos em alerta' });
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(within(list).getByText('Produto de estoque 8')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtro de alertas' }), {
      target: { value: 'validade' },
    });

    expect(within(list).getByText('Único produto de validade')).toBeInTheDocument();
    expect(within(list).queryByText('Produto de estoque 8')).not.toBeInTheDocument();
  });

  it('preserva o erro e permite tentar novamente a consulta da projeção', async () => {
    productApi.getAdminProductCatalog
      .mockRejectedValueOnce(
        createApplicationError({
          category: 'server',
          message: 'Falha sintética',
          retryable: true,
        })
      )
      .mockResolvedValueOnce(catalog);

    render(
      <MemoryRouter>
        <FollowUp />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O serviço não conseguiu concluir a operação.'
    );
    expect(
      screen.queryByText('Nenhum alerta de produto encontrado.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    const list = await screen.findByRole('list', { name: 'Produtos em alerta' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(productApi.getAdminProductCatalog).toHaveBeenCalledTimes(2);
  });
});
