import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  ResponsiveCell,
  ResponsiveRecord,
  ResponsiveTable,
} from './ResponsiveTable';
import Header from './Header';

const columns = [
  { key: 'name', label: 'Nome', weight: 2 },
  { key: 'action', label: 'Ações', weight: 1 },
];
it('compartilha metadados entre cabeçalho e pares, com uma árvore de controles', () => {
  render(
    <ResponsiveTable label='Registros' columns={columns}>
      <Header />
      <ResponsiveRecord>
        <ResponsiveCell columnKey='name'>{'A'.repeat(200)}</ResponsiveCell>
        <ResponsiveCell columnKey='action'>
          <button type='button'>Editar registro</button>
        </ResponsiveCell>
      </ResponsiveRecord>
    </ResponsiveTable>
  );
  expect(screen.getByRole('list', { name: 'Registros' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(
    screen.getAllByRole('button', { name: 'Editar registro' })
  ).toHaveLength(1);
  expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
  expect(screen.getByRole('listitem').querySelectorAll('dt')).toHaveLength(2);
});
it.each([
  { invalid: [{ key: 'name', label: '', weight: 1 }] },
  { invalid: [{ key: 'name', label: 'Nome', weight: 0 }] },
  {
    invalid: [
      { key: 'name', label: 'Nome', weight: 1 },
      { key: 'name', label: 'Outro', weight: 1 },
    ],
  },
])('rejeita metadados inválidos: $invalid', ({ invalid }) => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() =>
    render(
      <ResponsiveTable label='Registros' columns={invalid}>
        Registro
      </ResponsiveTable>
    )
  ).toThrow('colunas únicas');
});
it('não cria card sem contexto ou célula sem rótulo', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() =>
    render(<ResponsiveRecord>Sem contexto</ResponsiveRecord>)
  ).toThrow('exige ResponsiveTable');
  expect(() =>
    render(
      <ResponsiveTable label='Registros' columns={columns}>
        <ResponsiveRecord>
          <ResponsiveCell columnKey='missing'>Valor</ResponsiveCell>
        </ResponsiveRecord>
      </ResponsiveTable>
    )
  ).toThrow('Coluna responsiva desconhecida');
});
