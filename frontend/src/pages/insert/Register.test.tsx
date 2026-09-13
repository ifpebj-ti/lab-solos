import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Register from '@/pages/insert/Register';

vi.mock('@/components/global/forms/create/FormQuimicos', () => ({
  default: () => <div data-testid='manual-form-quimicos'>Formulário de químicos</div>,
}));

vi.mock('@/components/global/forms/create/FormVidraria', () => ({
  default: () => <div data-testid='manual-form-vidrarias'>Formulário de vidrarias</div>,
}));

vi.mock('@/components/global/forms/create/FormOutros', () => ({
  default: () => <div data-testid='manual-form-outros'>Formulário de outros</div>,
}));

describe('Register', () => {
  it('mantém as três abas de cadastro manual sem ações de importação ou lote', () => {
    render(<Register />);

    expect(screen.getByRole('heading', { name: 'Adicionar Bens' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Qu/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Vidr/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Outros/ })).toBeInTheDocument();
    expect(screen.getByTestId('manual-form-quimicos')).toBeInTheDocument();
    expect(screen.queryByText(/Planilha/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Inserção em Lotes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Planilhas/i })).not.toBeInTheDocument();
  });

  it.each([
    ['Vidrarias', 'manual-form-vidrarias'],
    ['Outros', 'manual-form-outros'],
  ])('seleciona a aba manual de %s', (tabName, formTestId) => {
    render(<Register />);

    fireEvent.mouseDown(screen.getByRole('tab', { name: new RegExp(tabName) }));

    expect(screen.getByRole('tabpanel')).toContainElement(
      screen.getByTestId(formTestId)
    );
  });
});
