import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import Pagination from './Pagination';

it('nomeia extremos, identifica página atual e mantém callbacks', () => {
  const change = vi.fn();
  render(
    <Pagination
      totalItems={70}
      itemsPerPage={7}
      currentPage={3}
      onPageChange={change}
    />
  );
  expect(screen.getByRole('button', { name: 'Página 3' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Última página' }));
  expect(change).toHaveBeenLastCalledWith(10);
  fireEvent.click(screen.getByRole('button', { name: 'Primeira página' }));
  expect(change).toHaveBeenLastCalledWith(1);
});
it('desabilita extremos sem registros', () => {
  render(
    <Pagination
      totalItems={0}
      itemsPerPage={7}
      currentPage={1}
      onPageChange={vi.fn()}
    />
  );
  expect(
    screen.getByRole('button', { name: 'Primeira página' })
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Última página' })).toBeDisabled();
});
