import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ItemTable from './Item';
import { ResponsiveTable } from './ResponsiveTable';

describe('ItemTable', () => {
  it('renderiza uma linha somente de leitura com os rótulos das colunas', () => {
    render(
      <ResponsiveTable
        label='Produtos químicos'
        columns={[
          { key: 'item', label: 'Item', weight: 4 },
          { key: 'quantity', label: 'Quantidade', weight: 2 },
        ]}
      >
        <ItemTable
          data={['Ácido cítrico', '4']}
          rowIndex={0}
        />
      </ResponsiveTable>
    );

    const record = screen.getByRole('listitem');
    expect(
      Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['Item', 'Quantidade']);
    expect(record).toHaveTextContent('Ácido cítrico');
    expect(record).toHaveTextContent('4');
    expect(record.querySelectorAll('a, button, input, select, textarea')).toHaveLength(0);
  });
});
