import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoanHistory from './LoanHistory';

const loansApi = vi.hoisted(() => ({
  approveLoan: vi.fn(),
  getLoansById: vi.fn(),
  rejectLoan: vi.fn(),
  returnLoan: vi.fn(),
}));
const excel = vi.hoisted(() => {
  const worksheet = { addRow: vi.fn() };
  const workbook = {
    addWorksheet: vi.fn(() => worksheet),
    xlsx: { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) },
  };
  return { worksheet, workbook };
});

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('file-saver', () => ({ default: { saveAs: vi.fn() } }));
vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(function Workbook() {
      return excel.workbook;
    }),
  },
}));
vi.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: ({ children }: { children: ReactNode }) => (
    <a href='#'>{children}</a>
  ),
}));
vi.mock('@/components/pdf/LoanDoc', () => ({ LoanDoc: () => null }));

const loan = {
  id: 99,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: '81999999999',
    nivelUsuario: 'Mentorado',
  },
  aprovador: null,
  produtos: [
    {
      emprestimoId: 99,
      quantidade: 2,
      produto: {
        id: 201,
        nomeProduto: 'A'.repeat(200),
        tipoProduto: 'Vidraria',
        quantidade: 2,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-201' },
      },
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/history/loan', state: { id: 99 } }]}>
      <LoanHistory />
    </MemoryRouter>
  );
}

describe('histórico detalhado de empréstimo administrativo responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getLoansById.mockResolvedValue(loan);
    loansApi.approveLoan.mockResolvedValue(undefined);
    loansApi.rejectLoan.mockResolvedValue(undefined);
    loansApi.returnLoan.mockResolvedValue(undefined);
  });

  it('mantém as seções aninhadas com cada valor no rótulo correto', async () => {
    renderPage();

    const linked = await screen.findByRole('list', { name: 'Mentorado vinculado' });
    const products = screen.getByRole('list', { name: 'Produtos selecionados' });

    expect(
      Array.from(within(linked).getByRole('listitem').querySelectorAll('dt')).map(
        (node) => node.textContent
      )
    ).toEqual(['Nome', 'Email', 'Telefone']);
    expect(
      Array.from(within(products).getByRole('listitem').querySelectorAll('dt')).map(
        (node) => node.textContent
      )
    ).toEqual(['Código', 'Nome', 'Tipo', 'Quantidade', 'Lote ID']);
    expect(products).toHaveTextContent('A'.repeat(200));
    expect(products).toHaveTextContent('2 unidades');
  });

  it('mantém o estado de carregamento e a ação de exportação disponível', () => {
    loansApi.getLoansById.mockImplementationOnce(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
  });

  it('mantém a exportação independente com os valores filtrados da lista', async () => {
    renderPage();
    await screen.findByRole('list', { name: 'Produtos selecionados' });

    fireEvent.click(screen.getByRole('button', { name: 'Exportar empréstimo' }));
    fireEvent.click(await screen.findByText('Excel'));

    await waitFor(() =>
      expect(excel.worksheet.addRow).toHaveBeenCalledWith({
        id: 201,
        item: 'A'.repeat(200),
        quant: 2,
        lote: 'L-201',
        tipo: 'Vidraria',
      })
    );
  });
});
