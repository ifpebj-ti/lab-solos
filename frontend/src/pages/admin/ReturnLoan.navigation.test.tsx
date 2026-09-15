import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { loanFixture } from '@/test/fixtures/loan';

import ReturnLoan from './ReturnLoan';

const loansApi = vi.hoisted(() => ({
  getLoansById: vi.fn(),
  returnLoan: vi.fn(),
}));

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/hooks/use-toast', () => ({ toast: vi.fn() }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location'>{location.search}</output>;
}

function renderPage(
  entry: string | { pathname: string; search?: string; state?: unknown }
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ReturnLoan />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('ReturnLoan: navegação recuperável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getLoansById.mockResolvedValue(loanFixture);
    loansApi.returnLoan.mockResolvedValue(undefined);
  });

  it('mantém Voltar disponível durante carregamento e carrega pelo ID da URL', async () => {
    loansApi.getLoansById.mockImplementationOnce(() => new Promise(() => {}));
    renderPage({ pathname: '/admin/return', search: '?id=42' });

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/all-loans'
    );
    expect(loansApi.getLoansById).toHaveBeenCalledWith({ id: 42 });
  });

  it('normaliza state.id com replace e não usa state quando a query é inválida', async () => {
    renderPage({ pathname: '/admin/return', state: { id: 42 } });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?id=42'));
    expect(loansApi.getLoansById).toHaveBeenCalledWith({ id: 42 });

    cleanup();
    loansApi.getLoansById.mockClear();
    renderPage({ pathname: '/admin/return', search: '?id=-1', state: { id: 42 } });
    expect(screen.getByText('Selecione um registro para consultar')).toBeInTheDocument();
    expect(loansApi.getLoansById).not.toHaveBeenCalled();
  });

  it('mostra o erro contextual de 404 e preserva a lista como retorno', async () => {
    loansApi.getLoansById.mockRejectedValue({ response: { status: 404 } });
    renderPage({ pathname: '/admin/return', search: '?id=404' });

    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_CATALOG.not_found.message);
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/all-loans'
    );
  });
});
