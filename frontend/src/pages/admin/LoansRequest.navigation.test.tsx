import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoansRequest from './LoansRequest';

const loansApi = vi.hoisted(() => ({ getAllLoans: vi.fn() }));

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({ default: () => null }));

const pendingLoan = {
  id: 71,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [],
  solicitante: {
    id: 501,
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
  },
  aprovador: null,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}{location.search}</output>;
}

describe('LoansRequest: navegação recuperável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getAllLoans.mockResolvedValue([pendingLoan]);
  });

  it('expõe o ID no link e permite ativação pelo teclado', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/loans-request']}>
        <LoansRequest />
        <LocationProbe />
      </MemoryRouter>
    );

    const detailLink = await screen.findByRole('link', { name: /01\/09\/2026/ });
    expect(detailLink).toHaveAttribute('href', '/admin/history/loan?id=71');

    detailLink.focus();
    expect(detailLink).toHaveFocus();
    fireEvent.click(detailLink);

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/admin/history/loan?id=71'
    );
  });
});
