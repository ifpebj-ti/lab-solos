import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FormQuimicos from './FormQuimicos';

describe('formatação da fórmula química', () => {
  it('mantém a digitação na linha de base e transforma somente a seleção', () => {
    render(<FormQuimicos />);
    const formula = screen.getByLabelText<HTMLInputElement>(/^Fórmula Química/);

    fireEvent.change(formula, { target: { value: '2H2O' } });
    expect(formula).toHaveValue('2H2O');

    formula.setSelectionRange(2, 3);
    const apply = screen.getByRole('button', { name: 'Aplicar subscrito' });
    apply.focus();
    fireEvent.click(apply);

    expect(formula).toHaveValue('2H₂O');
    expect(formula).toHaveFocus();
    expect([formula.selectionStart, formula.selectionEnd]).toEqual([2, 3]);

    const remove = screen.getByRole('button', { name: 'Remover subscrito' });
    remove.focus();
    fireEvent.click(remove);

    expect(formula).toHaveValue('2H2O');
    expect(formula).toHaveFocus();
  });

  it('preserva letras selecionadas e dígitos fora do intervalo', () => {
    render(<FormQuimicos />);
    const formula = screen.getByLabelText<HTMLInputElement>(/^Fórmula Química/);
    fireEvent.change(formula, { target: { value: 'C6H12O6' } });
    formula.setSelectionRange(1, 5);

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar subscrito' }));

    expect(formula).toHaveValue('C₆H₁₂O6');
  });
});
