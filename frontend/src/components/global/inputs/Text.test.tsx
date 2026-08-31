import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import InputText from './Text';

type FormData = {
  cidade: string;
};

function InputHarness({ error }: { error?: string }) {
  const { register } = useForm<FormData>();

  return (
    <InputText
      label='Cidade'
      type='text'
      register={register}
      name='cidade'
      error={error}
      required
    />
  );
}

describe('InputText', () => {
  it('associa label, input e mensagem de erro de forma acessivel', () => {
    render(<InputHarness error='Informe uma cidade válida.' />);

    const input = screen.getByRole('textbox', { name: /cidade/i });
    const error = screen.getByText('Informe uma cidade válida.');

    expect(input).toHaveAttribute('id', 'cidade');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('nao anuncia erro quando o campo e valido', () => {
    render(<InputHarness />);

    const input = screen.getByRole('textbox', { name: /cidade/i });

    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});
