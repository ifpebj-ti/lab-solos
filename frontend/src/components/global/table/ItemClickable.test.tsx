import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import ItemClickable from './ItemClickable';
import { ResponsiveTable } from './ResponsiveTable';

function Location() {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
}
it.each([101, 'produto-101'])(
  'preserva tipo e valor do ID %s em link e clique na linha',
  (id) => {
    render(
      <MemoryRouter>
        <ResponsiveTable
          label='Produtos'
          columns={[
            { key: 'id', label: 'ID', weight: 1 },
            { key: 'name', label: 'Nome', weight: 2 },
          ]}
        >
          <ItemClickable
            id={id}
            rowIndex={0}
            data={['101', 'Frasco']}
            destinationRoute='/produto'
          />
        </ResponsiveTable>
        <Location />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('link', { name: '101' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      JSON.stringify({ id })
    );
    fireEvent.click(screen.getByText('Frasco'));
    expect(screen.getByRole('status')).toHaveTextContent(
      JSON.stringify({ id })
    );
  }
);
it('exige contexto rotulado para renderizar a linha', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() =>
    render(
      <MemoryRouter>
        <ItemClickable
          id='legacy'
          rowIndex={0}
          data={['Frasco legado']}
          destinationRoute='/produto'
        />
      </MemoryRouter>
    )
  ).toThrow('ResponsiveTable');
});
it('rejeita array sem correspondência com os metadados', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() =>
    render(
      <MemoryRouter>
        <ResponsiveTable
          label='Produtos'
          columns={[{ key: 'id', label: 'ID', weight: 1 }]}
        >
          <ItemClickable
            id={1}
            rowIndex={0}
            data={['1', 'Excedente']}
            destinationRoute='/produto'
          />
        </ResponsiveTable>
      </MemoryRouter>
    )
  ).toThrow('Cada valor');
});
