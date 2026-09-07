import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ItemButton from './ItemButton';
import { ResponsiveTable } from './ResponsiveTable';

describe('ItemButton: contrato existente', () => {
  it('executa cada callback uma unica vez para a linha acionada', () => {
    const reject = vi.fn();
    const approve = vi.fn();

    render(
      <ResponsiveTable
        label='Solicitações'
        columns={[
          { key: 'date', label: 'Data', weight: 2 },
          { key: 'name', label: 'Nome', weight: 3 },
          { key: 'actions', label: 'Ações', weight: 1 },
        ]}
      >
        <ItemButton
          data={['01/09/2026', 'Ana Silva']}
          rowIndex={0}
          onClick1={reject}
          onClick2={approve}
          icon1={<span>recusar</span>}
          icon2={<span>aprovar</span>}
          itemLabel='Ana Silva'
          actionLabels={['Recusar', 'Aprovar']}
        />
      </ResponsiveTable>
    );

    fireEvent.click(screen.getByText('recusar'));
    fireEvent.click(screen.getByText('aprovar'));

    expect(reject).toHaveBeenCalledTimes(1);
    expect(approve).toHaveBeenCalledTimes(1);
  });

  it('associa valores e acoes a rotulos acessiveis no registro responsivo', () => {
    render(
      <ResponsiveTable
        label='Solicitacoes'
        columns={[
          { key: 'date', label: 'Data', weight: 2 },
          { key: 'name', label: 'Nome', weight: 3 },
          { key: 'actions', label: 'Acoes', weight: 1 },
        ]}
      >
        <ItemButton
          data={['01/09/2026', 'Ana Silva']}
          rowIndex={0}
          onClick1={vi.fn()}
          onClick2={vi.fn()}
          icon1={<span aria-hidden='true'>x</span>}
          icon2={<span aria-hidden='true'>ok</span>}
          itemLabel='Ana Silva'
          actionLabels={['Recusar', 'Aprovar']}
        />
      </ResponsiveTable>
    );

    const record = screen.getByRole('listitem');
    expect(
      Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['Data', 'Nome', 'Acoes']);
    expect(screen.getByRole('button', { name: 'Recusar Ana Silva' })).toHaveAttribute(
      'type',
      'button'
    );
    expect(screen.getByRole('button', { name: 'Aprovar Ana Silva' })).toHaveAttribute(
      'type',
      'button'
    );
  });
});
