import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import TableItemWithActions from './TableItemWithActions';
import { ResponsiveTable } from './ResponsiveTable';

const columns = [
  { key: 'name', label: 'Nome', weight: 3 },
  { key: 'status', label: 'Status', weight: 2 },
] as const;

function LocationState() {
  return (
    <output aria-label='estado da rota'>
      {JSON.stringify(useLocation().state)}
    </output>
  );
}

function renderItem(
  data: React.ReactNode[],
  onRowClick?: () => void,
  id: number | string = 17
) {
  return render(
    <MemoryRouter>
      <ResponsiveTable label='Usuários cadastrados' columns={columns}>
        <TableItemWithActions
          data={data}
          rowIndex={0}
          destinationRoute='/admin/view-class'
          id={id}
          onRowClick={onRowClick}
          itemLabel='Ana Silva'
        />
      </ResponsiveTable>
      <LocationState />
    </MemoryRouter>
  );
}

describe('TableItemWithActions', () => {
  it.each([17, 'user-17'])('preserva o tipo do id ao navegar para %s', (id) => {
    renderItem(['Ana Silva', 'Habilitado'], undefined, id);

    fireEvent.click(screen.getByRole('link', { name: 'Abrir Ana Silva' }));

    expect(screen.getByRole('status')).toHaveTextContent(JSON.stringify({ id }));
  });

  it('prioriza onRowClick e oferece uma acao primaria nomeada', () => {
    const onRowClick = vi.fn();
    renderItem(['Ana Silva', 'Habilitado'], onRowClick);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Ana Silva' }));

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('null');
  });

  it('rotula ReactNode por celula e ignora todos os controles interativos internos', () => {
    const onRowClick = vi.fn();
    renderItem(
      [
        'Ana Silva',
        <div key='controls'>
          <select aria-label='Status'><option>Habilitado</option></select>
          <button type='button'>Detalhes</button>
          <input aria-label='Observação' />
          <button type='button' role='switch' aria-checked='false'>Alternar</button>
          <input type='checkbox' aria-label='Selecionar' />
          <a href='#ajuda'>Ajuda</a>
        </div>,
      ],
      onRowClick
    );

    const record = screen.getByRole('listitem');
    expect(
      Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['Nome', 'Status']);

    for (const control of [
      screen.getByRole('combobox', { name: 'Status' }),
      screen.getByRole('button', { name: 'Detalhes' }),
      screen.getByRole('textbox', { name: 'Observação' }),
      screen.getByRole('switch', { name: 'Alternar' }),
      screen.getByRole('checkbox', { name: 'Selecionar' }),
      screen.getByRole('link', { name: 'Ajuda' }),
    ]) {
      fireEvent.click(control);
    }

    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('null');
  });
});
