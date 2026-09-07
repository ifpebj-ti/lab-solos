import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReturnLoan from './ReturnLoan';

const loansApi = vi.hoisted(() => ({
  getLoansById: vi.fn(),
  returnLoan: vi.fn(),
}));

vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const loan = {
  id: 99,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: '',
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: '81999999999',
    responsavel: null,
  },
  aprovador: null,
  produtos: [
    {
      emprestimoId: 99,
      quantidade: 2,
      produto: {
        id: 201,
        nomeProduto: 'Béquer',
        tipoProduto: 'Vidraria',
        quantidade: 2,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-201' },
      },
    },
    {
      emprestimoId: 99,
      quantidade: 1,
      produto: {
        id: 202,
        nomeProduto: 'Proveta',
        tipoProduto: 'Vidraria',
        quantidade: 1,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-202' },
      },
    },
    {
      emprestimoId: 99,
      quantidade: 3,
      produto: {
        id: 203,
        nomeProduto: 'Ácido cítrico',
        tipoProduto: 'Quimico',
        quantidade: 3,
        unidadeMedida: 'kg',
        lote: { codigoLote: 'L-203' },
      },
    },
    {
      emprestimoId: 99,
      quantidade: 4,
      produto: {
        id: 204,
        nomeProduto: 'Balança',
        tipoProduto: 'Outro',
        quantidade: 4,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-204' },
      },
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/return', state: { id: 99 } }]}>
      <ReturnLoan />
    </MemoryRouter>
  );
}

describe('devolução de empréstimo responsiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loansApi.getLoansById.mockResolvedValue(loan);
    loansApi.returnLoan.mockResolvedValue(undefined);
  });

  it('migra as três listas para registros rotulados e mantém leitura sem controles', async () => {
    renderPage();

    const chemicals = await screen.findByRole('list', { name: 'Químicos' });
    const glassware = screen.getByRole('list', { name: 'Vidrarias' });
    const others = screen.getByRole('list', { name: 'Outros' });
    const chemicalRecord = within(chemicals).getAllByRole('listitem')[0];
    const glasswareRecords = within(glassware).getAllByRole('listitem');
    const otherRecord = within(others).getAllByRole('listitem')[0];
    expect(chemicalRecord).toHaveTextContent('Ácido cítrico');
    expect(chemicalRecord.querySelectorAll('input,button')).toHaveLength(0);
    expect(glasswareRecords[0]).toHaveTextContent('Béquer');
    expect(otherRecord).toHaveTextContent('Balança');
    expect(screen.getAllByRole('switch')).toHaveLength(3);
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('expõe o carregamento enquanto a consulta está pendente', () => {
    loansApi.getLoansById.mockImplementationOnce(() => new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
  });

  it('mantém a regra checked/campo por registro sem criar persistência', async () => {
    renderPage();
    await screen.findByRole('list', { name: 'Vidrarias' });

    const firstSwitch = screen.getByLabelText('Devolução Béquer');
    const firstInput = screen.getByLabelText('Justificativa Béquer');
    const secondSwitch = screen.getByLabelText('Devolução Proveta');
    expect(firstSwitch).toBeChecked();
    expect(firstInput).toBeDisabled();
    fireEvent.click(firstSwitch);
    fireEvent.change(firstInput, { target: { value: 'Trincado' } });
    expect(secondSwitch).toBeChecked();
    expect(screen.getByLabelText('Justificativa Proveta')).toBeDisabled();

    expect(loansApi.returnLoan).not.toHaveBeenCalled();
    await waitFor(() => expect(firstInput).toHaveValue('Trincado'));
  });
});
