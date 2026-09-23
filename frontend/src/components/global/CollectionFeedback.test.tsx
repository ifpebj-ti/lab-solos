import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CollectionFeedback from './CollectionFeedback';

describe('CollectionFeedback', () => {
  it('diferencia carregamento, vazio inicial e filtro sem resultado', () => {
    const { rerender } = render(<CollectionFeedback state='loading' />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    expect(screen.queryByText(/nenhum registro/i)).not.toBeInTheDocument();

    rerender(<CollectionFeedback state='empty' />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Nenhum registro disponível.'
    );

    const onClearFilter = vi.fn();
    rerender(
      <CollectionFeedback state='filtered-empty' onClearFilter={onClearFilter} />
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Nenhum registro corresponde ao filtro.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtro' }));
    expect(onClearFilter).toHaveBeenCalledOnce();
  });

  it('anuncia falha com recuperação e preserva dados antigos durante atualização', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <CollectionFeedback
        state='error'
        message='Não foi possível carregar os registros.'
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os registros.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(
      <CollectionFeedback state='refreshing'>
        <ul aria-label='Registros antigos'>
          <li>Registro já carregado</li>
        </ul>
      </CollectionFeedback>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Atualizando');
    expect(screen.getByText('Registro já carregado')).toBeInTheDocument();
    expect(screen.queryByText(/nenhum registro/i)).not.toBeInTheDocument();
  });
});
