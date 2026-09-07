import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AllLoans from './AllLoans';

const loansApi = vi.hoisted(() => ({ getAllLoans: vi.fn() }));
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/ButtonLinkNotify', () => ({ default: () => null }));

const loan = {
  id: 3001,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: '',
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [{ id: 1 }],
  solicitante: { id: 1, nomeCompleto: 'Solicitante ' + 'A'.repeat(60), email: 'a@test.invalid' },
  aprovador: { id: 2, nomeCompleto: 'Responsável', email: 'b@test.invalid' },
};

describe('todos os empréstimos responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getAllLoans.mockResolvedValue([loan]);
  });

  it('rotula os campos e preserva o destino por ID', async () => {
    render(<MemoryRouter><AllLoans /></MemoryRouter>);
    const list = await screen.findByRole('list', { name: 'Todos os empréstimos' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Data de Solicitação', 'Solicitante', 'Responsável', 'Itens Utilizados', 'Status',
    ]);
    expect(record).toHaveTextContent('Solicitante');
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/admin/history/loan');
  });
});
