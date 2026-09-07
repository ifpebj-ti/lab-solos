import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ItemViewInfo from './ItemViewInfo';
import { ResponsiveTable } from './ResponsiveTable';

const columns = [
  { key: 'laboratory', label: 'Laboratório', weight: 2 },
  { key: 'date', label: 'Data', weight: 1.5 },
  { key: 'type', label: 'Tipo', weight: 1 },
  { key: 'location', label: 'Localização', weight: 2 },
  { key: 'responsible', label: 'Responsável', weight: 2 },
  { key: 'product', label: 'Produto', weight: 2 },
  { key: 'quantity', label: 'Quantidade', weight: 1 },
  { key: 'reason', label: 'Motivo', weight: 2 },
] as const;

const item = {
  nomeLaboratorio: 'Laboratório ' + 'L'.repeat(80),
  localizacao: 'Recife / Pernambuco',
  data: '07/09/2026',
  responsavel: 'Responsável',
  quantidade: '25un',
  produto: 'Produto sintético',
  motivo: 'Falta de material',
  ativo: true,
};

describe('ItemViewInfo responsivo', () => {
  it('expõe todos os campos rotulados e abre o diálogo de contato', () => {
    render(
      <ResponsiveTable label='Pedidos e ofertas' columns={columns}>
        <ItemViewInfo {...item} />
      </ResponsiveTable>
    );
    const record = screen.getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Laboratório', 'Data', 'Tipo', 'Localização', 'Responsável', 'Produto', 'Quantidade', 'Motivo',
    ]);
    expect(record).toHaveTextContent(item.nomeLaboratorio);

    fireEvent.click(within(record).getByText('Oferta'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Contato com o Laboratório');
    expect(screen.getByRole('alertdialog')).toHaveTextContent(item.produto);
  });
});
