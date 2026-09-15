import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loanFixture } from '@/test/fixtures/loan';

import LoanHistory from './LoanHistory';

const loansApi = vi.hoisted(() => ({ getLoansById: vi.fn() }));

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location'>{location.search}</output>;
}

function renderPage(
  entry: string | { pathname: string; search?: string; state?: unknown }
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LoanHistory />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('LoanHistory do mentorado: navegação recuperável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getLoansById.mockResolvedValue(loanFixture);
  });

  it('carrega por query e aponta Voltar para o histórico pessoal', async () => {
    renderPage({ pathname: '/mentee/history/loan', search: '?id=42' });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(loansApi.getLoansById).toHaveBeenCalledWith({ id: 42 });
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentee/history/mentoring'
    );
  });

  it('normaliza o state legado e rejeita query inválida sem fazer GET', async () => {
    renderPage({ pathname: '/mentee/history/loan', state: { id: 42 } });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?id=42'));
    expect(loansApi.getLoansById).toHaveBeenCalledWith({ id: 42 });

    cleanup();
    loansApi.getLoansById.mockClear();
    renderPage({
      pathname: '/mentee/history/loan',
      search: '?id=1.5',
      state: { id: 42 },
    });
    expect(screen.getByText('Selecione um registro para consultar')).toBeInTheDocument();
    expect(loansApi.getLoansById).not.toHaveBeenCalled();
  });

  it('mantém os metadados do empréstimo quando produtos é uma lista vazia', async () => {
    loansApi.getLoansById.mockResolvedValue({ ...loanFixture, produtos: [] });
    renderPage({ pathname: '/mentee/history/loan', search: '?id=42' });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Nenhum dado disponível para exibição.')).toBeInTheDocument();
  });
});
