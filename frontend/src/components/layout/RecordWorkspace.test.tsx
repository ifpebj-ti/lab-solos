import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RecordWorkspace from './RecordWorkspace';

describe('RecordWorkspace', () => {
  it('expõe lista e detalhe com seleção acessível e retorno móvel', () => {
    const onBack = vi.fn();
    const { container } = render(
      <RecordWorkspace
        selectedId='req-42'
        selectedLabel='Solicitação 42'
        onBack={onBack}
        list={<button type='button'>Solicitação 42</button>}
        detail={<p>Detalhe da solicitação 42</p>}
      />
    );

    expect(
      screen.getByRole('region', { name: 'Lista de registros' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Detalhe do registro' })
    ).toHaveTextContent('Solicitação 42');
    expect(screen.getByText('Registro selecionado: Solicitação 42')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a lista' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(container.querySelectorAll('button button')).toHaveLength(0);
  });
});
