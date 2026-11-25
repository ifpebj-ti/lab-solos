import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { parseCivilDateInput } from '@/function/date';
import DateInput from './DateInput';

interface DateFieldProps {
  initialValue?: string;
  error?: string;
  isDateDisabled?: (date: Date) => boolean;
  required?: boolean;
}

function DateField({
  initialValue = '05/11/2026',
  error,
  isDateDisabled,
  required,
}: DateFieldProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <DateInput
      nome='Data de validade'
      name='dataValidade'
      value={value}
      onChange={setValue}
      error={error}
      isDateDisabled={isDateDisabled}
      required={required}
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

  it('associa o erro ao campo e preserva texto digitado enquanto está incompleto', () => {
    render(<DateField error='Informe uma data válida.' required />);

    const field = screen.getByRole('textbox', { name: 'Data de validade' });
    expect(field).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    expect(field).toHaveAttribute('aria-required', 'true');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAttribute('aria-describedby', 'dataValidade-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe uma data válida.');

    fireEvent.change(field, { target: { value: '29/02/20' } });

    expect(field).toHaveValue('29/02/20');
    expect(parseCivilDateInput('29/02/20')).toBeUndefined();
  });

  it('mantém o padrão brasileiro quando o navegador usa outra localidade', () => {
    const languageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' });

    try {
      render(<DateField />);

      expect(screen.getByRole('textbox', { name: 'Data de validade' })).toHaveAttribute(
        'placeholder',
        'dd/mm/aaaa'
      );

      fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário: Data de validade' }));

      expect(screen.getByRole('spinbutton', { name: 'Ano' })).toHaveValue(2026);
      expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveDisplayValue('novembro');
    } finally {
      if (languageDescriptor) {
        Object.defineProperty(navigator, 'language', languageDescriptor);
      } else {
        Reflect.deleteProperty(navigator, 'language');
      }
    }
  });

  it('mantém sentinel digitado visível, mas não o considera uma data válida', () => {
    render(<DateField initialValue='01/01/0001' />);

    const field = screen.getByRole('textbox', { name: 'Data de validade' });
    expect(field).toHaveValue('01/01/0001');
    expect(parseCivilDateInput('01/01/0001')).toBeUndefined();
  });

  it('desabilita o sentinel de ausência no calendário', () => {
    render(<DateField initialValue='' />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário: Data de validade' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Ano' }), { target: { value: '1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Mês' }), { target: { value: '0' } });
    const januaryYearOne = screen.getByRole('grid', { name: /janeiro 1/i });
    const firstDay = within(januaryYearOne).getByRole('gridcell', { name: '1' });

    expect(firstDay).toBeDisabled();
  });

  it('aplica a restrição opcional de dias sem limitar outros dias do mês', () => {
    render(
      <DateField
        isDateDisabled={(date) => date.getDate() === 5}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário: Data de validade' }));
    const november = screen.getByRole('grid', { name: /novembro 2026/i });

    expect(within(november).getByRole('gridcell', { name: '5' })).toBeDisabled();
    expect(within(november).getByRole('gridcell', { name: '6' })).toBeEnabled();
  });

  it('permite navegar entre os dias do calendário pelo teclado', () => {
    render(<DateField />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário: Data de validade' }));
    const november = screen.getByRole('grid', { name: /novembro 2026/i });
    const fifth = within(november).getByRole('gridcell', { name: '5' });
    const sixth = within(november).getByRole('gridcell', { name: '6' });
    fifth.focus();
    fireEvent.focus(fifth);

    fireEvent.keyDown(fifth, {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
    });

    expect(sixth).toHaveFocus();
  });
});
