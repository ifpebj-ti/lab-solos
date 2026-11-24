import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DateInput from './DateInput';
import DateInputOutros from './DateInputOutros';
import DateInputVidraria from './DateInputVidraria';
import DateRangeInput from './DateRangeInput';

const englishDateMask = /dd\/mm\/yyyy/i;

describe('orientações de formato de data', () => {
  it('Químicos orienta em português e exibe o dia preenchido em números', () => {
    const props = {
      nome: 'Data de fabricação',
      name: 'dataFabricacao',
      onChange: vi.fn(),
    };
    const { container, rerender } = render(<DateInput {...props} value='' />);

    const input = screen.getByRole('textbox', { name: props.nome });
    expect(input).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    expect(container).not.toHaveTextContent(englishDateMask);

    rerender(<DateInput {...props} value='05/11/2026' />);
    expect(input).toHaveValue('05/11/2026');

    const error = 'Data de fabricação inválida. Use dd/mm/aaaa.';
    rerender(<DateInput {...props} value='31/02/2026' error={error} />);
    expect(input).toHaveAccessibleDescription(error);
    expect(container).not.toHaveTextContent(englishDateMask);
  });

  it.each([
    { category: 'Outros', DateField: DateInputOutros },
    { category: 'Vidrarias', DateField: DateInputVidraria },
  ])(
    '$category exibe o campo vazio e o erro de data sem máscara em inglês',
    ({ DateField }) => {
      const props = {
        nome: 'Data de fabricação',
        name: 'dataFabricacao' as const,
        setValue: vi.fn(),
      };
      const { container, rerender } = render(<DateField {...props} />);

      expect(screen.getByText(props.nome)).toBeVisible();
      expect(container).not.toHaveTextContent(englishDateMask);
      expect(
        screen.queryByPlaceholderText(englishDateMask)
      ).not.toBeInTheDocument();

      const error = 'Data de fabricação inválida';
      rerender(<DateField {...props} error={error} />);

      expect(screen.getByText(error)).toBeVisible();
      expect(container).not.toHaveTextContent(englishDateMask);
    }
  );

  it.each([
    { category: 'Outros', DateField: DateInputOutros },
    { category: 'Vidrarias', DateField: DateInputVidraria },
  ])(
    '$category exibe o dia escolhido em números e envia a data civil',
    ({ DateField }) => {
      vi.setSystemTime(new Date(2026, 10, 1));
      const setValue = vi.fn();

      render(
        <DateField
          nome='Data de fabricação'
          name='dataFabricacao'
          setValue={setValue}
        />
      );

      const trigger = screen.getByRole('button', {
        name: 'Selecione uma data',
      });
      fireEvent.click(trigger);
      const november = screen.getByRole('grid', { name: /november 2026/i });
      const [novemberFifth] = within(november).getAllByRole('gridcell', {
        name: '5',
      });
      fireEvent.click(novemberFifth);

      expect(trigger).toHaveTextContent('05/11/2026');
      expect(setValue).toHaveBeenCalledWith('dataFabricacao', '2026-11-05');
    }
  );

  it('exibe o intervalo em números e não mostra máscara em inglês ao limpá-lo', () => {
    render(<DateRangeInput />);

    const trigger = screen.getByRole('button', {
      name: '20/01/2022 - 09/02/2022',
    });
    fireEvent.click(trigger);
    const january = screen.getByRole('grid', { name: /january 2022/i });
    fireEvent.click(within(january).getByRole('gridcell', { name: '20' }));

    expect(trigger).not.toHaveTextContent('20/01/2022');
    expect(trigger).not.toHaveTextContent(englishDateMask);
  });
});
