import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { loanFixture } from '@/test/fixtures/loan';

import LoanHistory from './LoanHistory';

const loansApi = vi.hoisted(() => ({
  approveLoan: vi.fn(),
  getLoansById: vi.fn(),
  rejectLoan: vi.fn(),
  returnLoan: vi.fn(),
}));

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('file-saver', () => ({ default: { saveAs: vi.fn() } }));
vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(function Workbook() {
      return {
        addWorksheet: () => ({ addRow: vi.fn() }),
        xlsx: { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) },
      };
    }),
  },
}));
vi.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: ({ children }: { children: ReactNode }) => (
    <a href='#'>{children}</a>
  ),
}));
vi.mock('@/components/pdf/LoanDoc', () => ({ LoanDoc: () => null }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location'>{location.search}</output>;
}

function NavigateTo({ id }: { id: number }) {
  const navigate = useNavigate();
  return (
    <button type='button' onClick={() => navigate(`/admin/history/loan?id=${id}`)}>
      Abrir outro
    </button>
  );
}

function renderPage(
  entry: string | { pathname: string; search?: string; state?: unknown }
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LoanHistory />
      <LocationProbe />
      <NavigateTo id={2} />
    </MemoryRouter>
  );
}

describe('LoanHistory: navegação recuperável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getLoansById.mockResolvedValue(loanFixture);
  });

  it('carrega o empréstimo pelo ID da URL sem depender de state', async () => {
    renderPage({ pathname: '/admin/history/loan', search: '?id=42' });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(loansApi.getLoansById).toHaveBeenCalledWith({ id: 42 });
  });

  it('resolve o retorno conforme o perfil do mentor', async () => {
    renderPage({ pathname: '/mentor/history/loan', search: '?id=42' });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentor/history/class'
    );
  });

  it('normaliza state.id com replace antes de carregar o detalhe', async () => {
    renderPage({ pathname: '/admin/history/loan', state: { id: 42 } });

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?id=42'));
    expect(loansApi.getLoansById).toHaveBeenCalledWith({ id: 42 });
  });

  it('não faz requisição para query inválida nem recorre ao state', () => {
    renderPage({
      pathname: '/admin/history/loan',
      search: '?id=abc',
      state: { id: 42 },
    });

    expect(screen.getByText('Selecione um registro para consultar')).toBeInTheDocument();
    expect(loansApi.getLoansById).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/all-loans'
    );
  });

  it('preserva os metadados quando a lista de produtos está vazia', async () => {
    loansApi.getLoansById.mockResolvedValue({ ...loanFixture, produtos: [] });

    renderPage({ pathname: '/admin/history/loan', search: '?id=42' });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Nenhum dado disponível para exibição.')).toBeInTheDocument();
  });

  it('mostra erro contextual de 404 e mantém o retorno para a lista', async () => {
    loansApi.getLoansById.mockRejectedValue({ response: { status: 404 } });

    renderPage({ pathname: '/admin/history/loan', search: '?id=404' });

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.not_found.message);
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/all-loans'
    );
  });

  it('descarta a resposta de um ID anterior quando a URL muda', async () => {
    const deferred = new Map<number, (value: unknown) => void>();
    loansApi.getLoansById.mockImplementation(({ id }: { id: number }) =>
      new Promise((resolve) => deferred.set(id, resolve))
    );

    const firstLoan = { ...loanFixture, solicitante: { ...loanFixture.solicitante, nomeCompleto: 'Registro antigo' } };
    const currentLoan = { ...loanFixture, solicitante: { ...loanFixture.solicitante, nomeCompleto: 'Registro atual' } };
    renderPage({ pathname: '/admin/history/loan', search: '?id=1' });

    await waitFor(() => expect(deferred.has(1)).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir outro' }));
    await waitFor(() => expect(deferred.has(2)).toBe(true));

    deferred.get(2)?.(currentLoan);
    expect(await screen.findByText('Registro atual')).toBeInTheDocument();
    deferred.get(1)?.(firstLoan);
    await waitFor(() => expect(screen.queryByText('Registro antigo')).not.toBeInTheDocument());
  });
});
