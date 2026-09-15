import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoanCreation from './LoanCreation';

const productApi = vi.hoisted(() => ({ getAllProducts: vi.fn() }));
const classApi = vi.hoisted(() => ({ getDependentes: vi.fn() }));
const loansApi = vi.hoisted(() => ({ createLoan: vi.fn() }));
const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/integration/Product', () => productApi);
vi.mock('@/integration/Class', () => classApi);
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/global/inputs/PopoverInput', () => ({
  default: ({
    title,
    unidades,
    value,
    onChange,
  }: {
    title: string;
    unidades: Array<{ value: string | boolean; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      {title}
      <select
        aria-label={title}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value=''>Selecione...</option>
        {unidades.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

const products = [
  {
    id: 11,
    nomeProduto: 'Produto de teste',
    tipoProduto: 'Quimico',
    fornecedor: 'Fornecedor',
    quantidade: 10,
    quantidadeMinima: 1,
    localizacaoProduto: 'A1',
    dataFabricacao: null,
    dataValidade: null,
    status: 'Disponivel',
  },
];

const dependent = {
  id: 501,
  nomeCompleto: 'Pessoa de teste',
  email: 'pessoa@example.invalid',
  telefone: null,
  dataIngresso: '2026-09-01',
  status: 'Habilitado',
  nivelUsuario: 'Mentorado',
  tipoUsuario: 'Academico',
  cidade: 'Belo Jardim',
  curso: 'ES',
  instituicao: 'IFPE',
  responsavel: null,
};

async function prepareLoan() {
  await screen.findByLabelText('Usuário');
  fireEvent.change(screen.getByLabelText('Usuário'), {
    target: { value: '501' },
  });
  fireEvent.change(screen.getByLabelText('Grupo'), {
    target: { value: 'Quimico' },
  });
  await waitFor(() =>
    expect(
      within(screen.getByLabelText('Item')).getByRole('option', {
        name: 'Produto de teste',
      })
    ).toBeInTheDocument()
  );
  fireEvent.change(screen.getByLabelText('Item'), {
    target: { value: '11' },
  });
  fireEvent.change(screen.getByLabelText('Unidade de Medida'), {
    target: { value: 'Litro' },
  });
  fireEvent.change(screen.getByLabelText('Quantidade'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
  await waitFor(() =>
    expect(screen.getByRole('listitem')).toHaveTextContent('Produto de teste')
  );
}

const requestLoan = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar Empréstimo' }));

const selectedProductsList = () =>
  screen.getByRole('list', { name: 'Produtos selecionados' });

describe('criação de empréstimo: jornada crítica', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getAllProducts.mockResolvedValue(products);
    classApi.getDependentes.mockResolvedValue([dependent]);
    loansApi.createLoan.mockResolvedValue({ status: 201 });
  });

  it('envia o contrato de criação e só limpa a seleção após sucesso', async () => {
    render(<LoanCreation />);
    await prepareLoan();

    requestLoan();

    await waitFor(() => expect(loansApi.createLoan).toHaveBeenCalledOnce());
    expect(loansApi.createLoan).toHaveBeenCalledWith({
      diasParaDevolucao: 5,
      produtos: [{ produtoId: 11, quantidade: 2 }],
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Solicitação de empréstimo'),
      })
    );
    expect(
      screen.getByText('Nenhum dado disponível para exibição.')
    ).toBeInTheDocument();
  });

  it('mantém um único envio enquanto a requisição está pendente', async () => {
    let resolveLoan!: (value: { status: number }) => void;
    loansApi.createLoan.mockImplementation(
      () => new Promise((resolve) => (resolveLoan = resolve))
    );

    render(<LoanCreation />);
    await prepareLoan();

    const submit = screen.getByRole('button', { name: 'Solicitar Empréstimo' });
    requestLoan();
    fireEvent.click(submit);

    expect(loansApi.createLoan).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');

    resolveLoan({ status: 201 });
    await waitFor(() =>
      expect(screen.getByText('Nenhum dado disponível para exibição.')).toBeInTheDocument()
    );
  });

  it('preserva a seleção e permite retentar após recusa da API', async () => {
    loansApi.createLoan
      .mockRejectedValueOnce(new Error('API indisponível'))
      .mockResolvedValueOnce({ status: 201 });

    render(<LoanCreation />);
    await prepareLoan();

    requestLoan();
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro na criação do empréstimo',
        })
      )
    );
    expect(
      within(selectedProductsList()).getByText('Produto de teste')
    ).toBeInTheDocument();

    requestLoan();
    await waitFor(() => expect(loansApi.createLoan).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText('Nenhum dado disponível para exibição.')
    ).toBeInTheDocument();
  });
});
