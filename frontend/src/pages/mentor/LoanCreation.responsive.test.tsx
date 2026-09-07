import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoanCreation from './LoanCreation';

const productApi = vi.hoisted(() => ({ getAllProducts: vi.fn() }));
const classApi = vi.hoisted(() => ({ getDependentes: vi.fn() }));
const loansApi = vi.hoisted(() => ({ createLoan: vi.fn() }));

vi.mock('@/integration/Product', () => productApi);
vi.mock('@/integration/Class', () => classApi);
vi.mock('@/integration/Loans', () => loansApi);
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
    nomeProduto: 'Ácido cítrico',
    tipoProduto: 'Quimico',
    fornecedor: 'Fornecedor',
    quantidade: 10,
    quantidadeMinima: 1,
    localizacaoProduto: 'A1',
    dataFabricacao: null,
    dataValidade: null,
    status: 'Disponivel',
  },
  {
    id: 12,
    nomeProduto: 'Béquer graduado',
    tipoProduto: 'Vidraria',
    fornecedor: 'Fornecedor',
    quantidade: 8,
    quantidadeMinima: 1,
    localizacaoProduto: 'B1',
    dataFabricacao: null,
    dataValidade: null,
    status: 'Disponivel',
  },
];

const dependent = {
  id: 501,
  nomeCompleto: 'Ana Silva',
  email: 'ana@example.invalid',
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

async function addProduct(
  group: string,
  item: string,
  quantity: string,
  expectedCount: number
) {
  fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: group } });
  await waitFor(() =>
    expect(
      within(screen.getByLabelText('Item')).getByRole('option', {
        name: products.find((product) => String(product.id) === item)!
          .nomeProduto,
      })
    ).toBeInTheDocument()
  );
  fireEvent.change(screen.getByLabelText('Item'), { target: { value: item } });
  fireEvent.change(screen.getByLabelText('Unidade de Medida'), {
    target: { value: 'Litro' },
  });
  fireEvent.change(screen.getByLabelText('Quantidade'), {
    target: { value: quantity },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
  await waitFor(() =>
    expect(
      within(
        screen.getByRole('list', { name: 'Produtos selecionados' })
      ).getAllByRole('listitem')
    ).toHaveLength(expectedCount)
  );
}

describe('criação de empréstimo responsiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getAllProducts.mockResolvedValue(products);
    classApi.getDependentes.mockResolvedValue([dependent]);
    loansApi.createLoan.mockResolvedValue({ status: 201 });
  });

  it('remove somente o registro escolhido e preserva os demais sem solicitar empréstimo', async () => {
    render(<LoanCreation />);

    await screen.findByText('Ana Silva');
    fireEvent.change(screen.getByLabelText('Usuário'), {
      target: { value: '501' },
    });
    await addProduct('Quimico', '11', '2', 1);
    await addProduct('Vidraria', '12', '3', 2);

    const list = screen.getByRole('list', { name: 'Produtos selecionados' });
    const records = within(list).getAllByRole('listitem');
    expect(records).toHaveLength(2);
    expect(records[0]).toHaveTextContent('Ácido cítrico');
    expect(records[1]).toHaveTextContent('Béquer graduado');

    fireEvent.click(
      screen.getByRole('button', { name: 'Remover Béquer graduado' })
    );

    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Ácido cítrico')).toBeInTheDocument();
    expect(within(list).queryByText('Béquer graduado')).not.toBeInTheDocument();
    expect(loansApi.createLoan).not.toHaveBeenCalled();
  });

  it('mantém colunas, ação nomeada e estado vazio', async () => {
    render(<LoanCreation />);
    await screen.findByText('Ana Silva');

    expect(
      screen.getByText('Nenhum dado disponível para exibição.')
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Usuário'), {
      target: { value: '501' },
    });
    await addProduct('Quimico', '11', '2', 1);

    const record = screen.getByRole('listitem');
    expect(
      Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['Código', 'Nome do Produto', 'Quantidade', 'Ação']);
    expect(
      screen.getByRole('button', { name: 'Remover Ácido cítrico' })
    ).toHaveAttribute('type', 'button');
  });

  it('mantém carregamento acessível e estado vazio após falha', async () => {
    let rejectProducts!: (reason: Error) => void;
    productApi.getAllProducts.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectProducts = reject;
        })
    );

    render(<LoanCreation />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');

    rejectProducts(new Error('Falha sintética'));

    expect(
      await screen.findByText('Nenhum dado disponível para exibição.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
