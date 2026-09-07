import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ItemReturn from './ItemReturn';
import { ResponsiveTable } from './ResponsiveTable';

const columns = [
  { key: 'item', label: 'Item', weight: 4 },
  { key: 'quantity', label: 'Quantidade', weight: 2 },
  { key: 'return', label: 'Devolução', weight: 2 },
  { key: 'reason', label: 'Justificativa', weight: 4 },
] as const;

function renderRows() {
  return render(
    <ResponsiveTable label='Vidrarias' columns={columns}>
      <ItemReturn
        data={['Béquer', '2']}
        rowIndex={0}
        rowId='glass-201'
      />
      <ItemReturn
        data={['Proveta', '1']}
        rowIndex={1}
        rowId='glass-202'
      />
    </ResponsiveTable>
  );
}

describe('ItemReturn', () => {
  it('associa controles a registros distintos com IDs e labels únicos', () => {
    renderRows();

    const switches = screen.getAllByRole('switch');
    const inputs = screen.getAllByRole('textbox');
    expect(switches).toHaveLength(2);
    expect(inputs).toHaveLength(2);
    expect(new Set(switches.map((control) => control.id)).size).toBe(2);
    expect(new Set(inputs.map((control) => control.id)).size).toBe(2);
    expect(screen.getByLabelText('Devolução Béquer')).toBe(switches[0]);
    expect(screen.getByLabelText('Justificativa Béquer')).toBe(inputs[0]);
    expect(screen.getByLabelText('Devolução Proveta')).toBe(switches[1]);
    expect(screen.getByLabelText('Justificativa Proveta')).toBe(inputs[1]);
  });

  it('mantém checked, habilitação do campo e valores durante a renderização', () => {
    const view = renderRows();
    const firstSwitch = screen.getByLabelText('Devolução Béquer');
    const firstInput = screen.getByLabelText('Justificativa Béquer');

    expect(firstSwitch).toBeChecked();
    expect(firstInput).toBeDisabled();
    fireEvent.click(firstSwitch);
    expect(firstSwitch).not.toBeChecked();
    expect(firstInput).toBeEnabled();
    fireEvent.change(firstInput, { target: { value: 'Quebrou durante o uso' } });

    view.rerender(
      <ResponsiveTable label='Vidrarias' columns={columns}>
        <ItemReturn
          data={['Béquer', '2']}
          rowIndex={0}
          rowId='glass-201'
        />
        <ItemReturn
          data={['Proveta', '1']}
          rowIndex={1}
          rowId='glass-202'
        />
      </ResponsiveTable>
    );

    expect(screen.getByLabelText('Devolução Béquer')).not.toBeChecked();
    expect(screen.getByLabelText('Justificativa Béquer')).toHaveValue(
      'Quebrou durante o uso'
    );
    expect(screen.getByLabelText('Devolução Proveta')).toBeChecked();
    expect(screen.getByLabelText('Justificativa Proveta')).toBeDisabled();
  });
});
