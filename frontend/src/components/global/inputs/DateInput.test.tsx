import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DateInput from './DateInput';

function DateField() {
  const [value, setValue] = useState('05/11/2026');

  return (
    <DateInput
      nome='Data de validade'
      name='dataValidade'
      value={value}
      onChange={setValue}
    />
  );
}

describe('DateInput', () => {
  it('abre no dia digitado e substitui a digitação por um dia bissexto no calendário', () => {
    render(<DateField />);

    const field = screen.getByRole('textbox', { name: 'Data de validade' });
    const calendar = screen.getByRole('button', { name: 'Abrir calendário: Data de validade' });
    fireEvent.click(calendar);

    const year = screen.getByRole('spinbutton', { name: 'Ano' });
    const month = screen.getByRole('combobox', { name: 'Mês' });
    expect(year).toHaveValue(2026);
    expect(month).toHaveDisplayValue('novembro');
    const november = screen.getByRole('grid', { name: /novembro 2026/i });
    expect(within(november).getByRole('gridcell', { name: '5' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.change(year, { target: { value: '2000' } });
    fireEvent.change(month, { target: { value: '1' } });
    const february = screen.getByRole('grid', { name: /fevereiro 2000/i });
    fireEvent.click(within(february).getByRole('gridcell', { name: '29' }));

    expect(field).toHaveValue('29/02/2000');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();

    fireEvent.change(field, { target: { value: '29/02/20' } });
    fireEvent.click(calendar);
    expect(screen.queryByRole('gridcell', { selected: true })).not.toBeInTheDocument();
  });
});
