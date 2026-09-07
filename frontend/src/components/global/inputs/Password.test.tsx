import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { expect, it } from 'vitest';
import InputPassword from './Password';

function Fixture() {
  const { register } = useForm<{ senha: string }>();
  return (
    <InputPassword
      label='Senha'
      name='senha'
      register={register}
      error='Use uma senha válida.'
    />
  );
}

it('associa senha e erro e permite mostrar e ocultar sem perder o valor', () => {
  render(<Fixture />);
  const input = screen.getByLabelText('Senha');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Use uma senha válida.');
  fireEvent.change(input, { target: { value: 'Sintetica123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar Senha' }));
  expect(input).toHaveAttribute('type', 'text');
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar Senha' }));
  expect(input).toHaveAttribute('type', 'password');
  expect(input).toHaveValue('Sintetica123!');
});
