import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SearchInput from './SearchInput';

it('oferece nome acessível e preserva busca ao editar', () => {
  const change = vi.fn();
  render(<SearchInput name='search' value='vidro' onChange={change} />);
  const input = screen.getByRole('textbox', { name: 'Pesquisar' });
  expect(input).toHaveValue('vidro');
  fireEvent.change(input, { target: { value: 'frasco' } });
  expect(change).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
