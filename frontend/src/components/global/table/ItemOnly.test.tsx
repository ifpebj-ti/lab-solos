import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ItemOnly from './ItemOnly';
import { ResponsiveTable } from './ResponsiveTable';

describe('ItemOnly', () => {
  it('renderiza todos os valores com os rótulos compartilhados da tabela responsiva', () => {
    render(
      <ResponsiveTable
        label='Mentorado vinculado'
        columns={[
          { key: 'name', label: 'Nome', weight: 3 },
          { key: 'email', label: 'Email', weight: 2 },
          { key: 'phone', label: 'Telefone', weight: 2 },
        ]}
      >
        <ItemOnly
          data={['Ana Silva', 'ana@example.invalid', '81999999999']}
        />
      </ResponsiveTable>
    );

    const record = screen.getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Nome',
      'Email',
      'Telefone',
    ]);
    expect(record).toHaveTextContent('Ana Silva');
    expect(record).toHaveTextContent('ana@example.invalid');
    expect(record).toHaveTextContent('81999999999');
  });

  it('mantém valores longos e explicita quando a quantidade de dados não corresponde às colunas', () => {
    render(
      <ResponsiveTable
        label='Produtos selecionados'
        columns={[{ key: 'item', label: 'Item', weight: 1 }]}
      >
        <ItemOnly data={['A'.repeat(200)]} />
      </ResponsiveTable>
    );

    expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
  });
});
