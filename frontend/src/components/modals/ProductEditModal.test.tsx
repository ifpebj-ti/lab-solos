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
    updateProductMock.mockReset();
  });

  it('envia somente a mudança e solicita atualização da consulta após salvar', async () => {
    updateProductMock.mockResolvedValue({ ...product, nomeProduto: 'Nome alterado' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(<ProductEditModal isOpen onClose={onClose} onSuccess={onSuccess} product={product} />);

    fireEvent.change(screen.getByLabelText('Nome do Produto'), { target: { value: 'Nome alterado' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(updateProductMock).toHaveBeenCalledExactlyOnceWith({
      id: product.id,
      operations: [{ op: 'replace', path: '/nomeProduto', value: 'Nome alterado' }],
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSuccess.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it('expressa a limpeza dos campos opcionais com remoções explícitas', async () => {
    updateProductMock.mockResolvedValue({ ...product, fornecedor: null, dataFabricacao: null, dataValidade: null });
    render(<ProductEditModal isOpen onClose={vi.fn()} product={product} />);
    fireEvent.change(screen.getByLabelText(/Marca|Fornecedor/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Data de Fabricação'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Data de Validade'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledOnce());
    expect(updateProductMock).toHaveBeenCalledWith({
      id: product.id,
      operations: [
        { op: 'remove', path: '/fornecedor' },
        { op: 'remove', path: '/dataFabricacao' },
        { op: 'remove', path: '/dataValidade' },
      ],
    });
  });

  it('mantém CATMAT histórico somente para leitura', () => {
    render(<ProductEditModal isOpen onClose={vi.fn()} product={product} />);
    expect(screen.getByLabelText('CATMAT')).toHaveAttribute('readonly');
  });

  it('omite alteração de formatação numérica sem mudança do valor', async () => {
    render(<ProductEditModal isOpen onClose={vi.fn()} product={product} />);
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '10.00' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it('mantém o erro de operação no diálogo e permite corrigir e reenviar', async () => {
    updateProductMock.mockRejectedValueOnce({
      name: 'ApplicationError', category: 'validation', message: 'validation failed',
      fieldErrors: { operations: ['Operação não permitida.'] }, retryable: false,
    }).mockResolvedValueOnce({ ...product, nomeProduto: 'Nome corrigido' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(<ProductEditModal isOpen onClose={onClose} onSuccess={onSuccess} product={product} />);
    const name = screen.getByLabelText('Nome do Produto');
    fireEvent.change(name, { target: { value: 'Nome recusado' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));

    await waitFor(() => expect(screen.getByText('Operação não permitida.')).toHaveAttribute('role', 'alert'));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(name).toHaveValue('Nome recusado');
    expect(name).toBeEnabled();
    fireEvent.change(name, { target: { value: 'Nome corrigido' } });
    expect(screen.queryByText('Operação não permitida.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(updateProductMock).toHaveBeenLastCalledWith({
      id: product.id,
      operations: [{ op: 'replace', path: '/nomeProduto', value: 'Nome corrigido' }],
    });
  });

  it('preserva a versão aberta e a edição quando a consulta é atualizada', async () => {
    updateProductMock.mockRejectedValue({
      name: 'ApplicationError', category: 'conflict', message: 'conflict', retryable: false,
    });
    const { rerender } = render(<ProductEditModal isOpen onClose={vi.fn()} product={product} />);
    const name = screen.getByLabelText('Nome do Produto');
    fireEvent.change(name, { target: { value: 'Nome em edição' } });
    rerender(<ProductEditModal isOpen onClose={vi.fn()} product={{ ...product, quantidade: 7 }} />);

    expect(name).toHaveValue('Nome em edição');
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
    await waitFor(() => expect(updateProductMock).toHaveBeenCalledOnce());
    expect(updateProductMock).toHaveBeenCalledWith({
      id: product.id,
      operations: [{ op: 'replace', path: '/nomeProduto', value: 'Nome em edição' }],
    });
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
