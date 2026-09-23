import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductEditModal from './ProductEditModal';

const updateProductMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/integration/Product', () => ({
  updateProduct: updateProductMock,
}));

vi.mock('@/components/hooks/use-toast', () => ({
  toast: toastMock,
}));

const product = {
  id: 7,
  catmat: 'CAT-7',
  nomeProduto: 'Béquer de vidro',
  quantidade: 10,
  quantidadeMinima: 2,
  fornecedor: 'Labon',
  localizacaoProduto: 'Estante A1',
  dataFabricacao: '2026-01-01T00:00:00.000Z',
  dataValidade: '2027-01-01T00:00:00.000Z',
  status: 'Disponivel',
};

describe('ProductEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('associa erro de campo e preserva os valores quando a atualização falha', async () => {
    updateProductMock.mockRejectedValue({
      name: 'ApplicationError',
      category: 'validation',
      message: 'validation failed',
      fieldErrors: { nomeProduto: ['Campo invalido'] },
      retryable: false,
    });

    render(
      <ProductEditModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={product}
      />
    );

    const nameInput = screen.getByLabelText('Nome do Produto');
    fireEvent.change(nameInput, { target: { value: 'Nome extenso para preservar' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));

    await waitFor(() => expect(screen.getByText('Campo invalido')).toBeInTheDocument());
    expect(nameInput).toHaveValue('Nome extenso para preservar');
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', 'nomeProduto-error');
    expect(updateProductMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });

  it('impede envio duplicado enquanto a atualização está pendente', async () => {
    let releaseRequest!: () => void;
    updateProductMock.mockImplementation(
      () => new Promise<void>((resolve) => { releaseRequest = resolve; })
    );

    render(
      <ProductEditModal
        isOpen
        onClose={vi.fn()}
        product={product}
      />
    );

    const nameInput = screen.getByLabelText('Nome do Produto');
    fireEvent.change(nameInput, { target: { value: 'Nome atualizado' } });
    const saveButton = screen.getByRole('button', { name: /Salvar/ });
    fireEvent.click(saveButton);
    await waitFor(() => expect(saveButton).toBeDisabled());
    fireEvent.click(saveButton);

    expect(updateProductMock).toHaveBeenCalledTimes(1);
    releaseRequest();
    await waitFor(() => expect(saveButton).toBeEnabled());
  });
});
