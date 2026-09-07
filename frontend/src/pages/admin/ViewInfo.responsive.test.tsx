import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import ViewInfo from './ViewInfo';

vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/global/UnderDevelopment', () => ({ default: () => null }));

describe('pedidos e ofertas responsivos', () => {
  it('renderiza registros rotulados com conteúdo longo sem tabela mínima fixa', () => {
    render(
      <MemoryRouter>
        <ViewInfo />
      </MemoryRouter>
    );
    const list = screen.getByRole('list', { name: 'Pedidos e ofertas' });
    const record = within(list).getAllByRole('listitem')[0];
    expect(record.querySelectorAll('dt')).toHaveLength(8);
    expect(within(record).getByText('Oferta')).toBeInTheDocument();
    expect(screen.queryByText('min-w-[800px]')).not.toBeInTheDocument();
  });
});
