import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FollowUp from './FollowUp';

const productApi = vi.hoisted(() => ({ getAlertProducts: vi.fn() }));

vi.mock('@/integration/Product', () => productApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const alerts = [
  {
    id: 91,
    nomeProduto: 'Produto com nome muito longo sem espaços ' + 'A'.repeat(80),
    tipoProduto: 'Químico',
    fornecedor: 'Fornecedor',
    quantidade: 2,
    quantidadeMinima: 8,
    localizacaoProduto: 'Armário',
    dataFabricacao: null,
    dataValidade: '2026-12-20',
    status: 'Disponível',
    unidadeMedida: 'Litro',
  },
];

describe('acompanhamento responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getAlertProducts.mockResolvedValue(alerts);
  });

  it('associa todos os campos do alerta a rótulos e preserva o destino', async () => {
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
      '/admin/verification'
    );
  });
});
