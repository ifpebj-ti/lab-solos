import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import ItemButtonLink from './ItemButtonLink';
import { ResponsiveTable } from './ResponsiveTable';

function LocationState() {
  return <output aria-label='estado da rota'>{JSON.stringify(useLocation().state)}</output>;
}

describe('ItemButtonLink: contratos existentes', () => {
  it.each([71, 'loan-71'])('preserva destino e tipo do state.id %s', (id) => {
    render(
      <MemoryRouter>
        <ResponsiveTable label='Solicitações' columns={[
          { key: 'date', label: 'Data', weight: 2 },
          { key: 'name', label: 'Nome', weight: 3 },
          { key: 'email', label: 'Email', weight: 4 },
          { key: 'actions', label: 'Ações', weight: 1 },
        ]}>
          <ItemButtonLink
            data={['01/09/2026', 'Ana Silva', 'ana@example.invalid']}
            rowIndex={0}
            onClick1={vi.fn()}
            onClick2={vi.fn()}
            icon1={<span>recusar</span>}
            icon2={<span>aprovar</span>}
            destinationRoute='/admin/history/loan'
            id={id}
            itemLabel='Ana Silva'
            actionLabels={['Recusar', 'Aprovar']}
          />
        </ResponsiveTable>
        <LocationState />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Ana Silva'));

    expect(screen.getByRole('status')).toHaveTextContent(JSON.stringify({ id }));
  });

  it('executa cada callback uma unica vez para o registro acionado', () => {
    const reject = vi.fn();
    const approve = vi.fn();
    render(
      <MemoryRouter>
        <ResponsiveTable label='Solicitações' columns={[
          { key: 'date', label: 'Data', weight: 2 },
          { key: 'name', label: 'Nome', weight: 3 },
          { key: 'email', label: 'Email', weight: 4 },
          { key: 'actions', label: 'Ações', weight: 1 },
        ]}>
        <ItemButtonLink
          data={['01/09/2026', 'Ana Silva', 'ana@example.invalid']}
          rowIndex={0}
          onClick1={reject}
          onClick2={approve}
          icon1={<span>recusar</span>}
          icon2={<span>aprovar</span>}
          destinationRoute='/admin/history/loan'
          id={71}
          itemLabel='Ana Silva'
          actionLabels={['Recusar', 'Aprovar']}
        />
        </ResponsiveTable>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('recusar'));
    fireEvent.click(screen.getByText('aprovar'));

    expect(reject).toHaveBeenCalledTimes(1);
    expect(approve).toHaveBeenCalledTimes(1);
  });

  it('separa o link primario das acoes rotuladas sem navegacao acidental', () => {
    const reject = vi.fn();
    const approve = vi.fn();
    render(
      <MemoryRouter>
        <ResponsiveTable
          label='Solicitações de empréstimo'
          columns={[
            { key: 'requestedAt', label: 'Data de solicitação', weight: 2 },
            { key: 'name', label: 'Nome', weight: 3 },
            { key: 'email', label: 'Email', weight: 4 },
            { key: 'actions', label: 'Ações', weight: 1 },
          ]}
        >
          <ItemButtonLink
            data={['01/09/2026', 'Ana Silva', 'ana@example.invalid']}
            rowIndex={0}
            onClick1={reject}
            onClick2={approve}
            icon1={<span aria-hidden='true'>x</span>}
            icon2={<span aria-hidden='true'>ok</span>}
            destinationRoute='/admin/history/loan'
            id={71}
            itemLabel='Ana Silva'
            actionLabels={['Recusar', 'Aprovar']}
          />
        </ResponsiveTable>
        <LocationState />
      </MemoryRouter>
    );

    const record = screen.getByRole('listitem');
    expect(
      Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['Data de solicitação', 'Nome', 'Email', 'Ações']);

    const rejectButton = screen.getByRole('button', { name: 'Recusar Ana Silva' });
    expect(rejectButton).toHaveAttribute('type', 'button');
    fireEvent.click(rejectButton);
    expect(reject).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('null');

    const approveButton = screen.getByRole('button', { name: 'Aprovar Ana Silva' });
    fireEvent.click(approveButton);
    expect(approve).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('null');

    fireEvent.click(screen.getByRole('link', { name: '01/09/2026' }));
    expect(screen.getByRole('status')).toHaveTextContent('{"id":71}');
  });
});
