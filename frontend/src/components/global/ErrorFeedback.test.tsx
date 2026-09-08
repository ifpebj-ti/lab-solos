import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import { ERROR_CATALOG, OPERATION_IDS } from '@/errors/errorCatalog';
import { presentError } from '@/errors/presentError';

import ErrorFeedback from './ErrorFeedback';

describe('ErrorFeedback', () => {
  it('anuncia o erro, recebe foco e associa a referência e campos', () => {
    const presentation = presentError(
      createApplicationError({
        category: 'validation',
        message: 'SENTINELA_REMOTA',
        requestId: 'trace-789',
        fieldErrors: {
          email: ['Verifique este campo.'],
        },
        retryable: false,
      }),
      OPERATION_IDS.createMentor
    );

    render(<ErrorFeedback presentation={presentation} />);

    const feedback = screen.getByRole('alert');
    expect(feedback).toHaveAttribute('aria-live', 'assertive');
    expect(feedback).toHaveFocus();
    expect(feedback).toHaveTextContent('Não foi possível cadastrar o usuário');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.validation.message);
    expect(feedback).toHaveTextContent(ERROR_CATALOG.validation.suggestedAction);
    expect(feedback).toHaveTextContent('Código de referência: trace-789');
    expect(feedback).toHaveTextContent('Verifique este campo.');
    expect(feedback).not.toHaveTextContent('SENTINELA_REMOTA');
  });

  it('oferece repetição somente para falhas repetíveis e executa o callback', () => {
    const onRetry = vi.fn();
    const retryable = presentError(
      createApplicationError({
        category: 'timeout',
        message: 'SENTINELA_REMOTA',
        retryable: true,
      }),
      OPERATION_IDS.products
    );

    const { rerender } = render(
      <ErrorFeedback presentation={retryable} onRetry={onRetry} />
    );

    const retry = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(
      <ErrorFeedback
        presentation={presentError(
          createApplicationError({
            category: 'authorization',
            message: 'SENTINELA_REMOTA',
            retryable: false,
          }),
          OPERATION_IDS.products
        )}
        onRetry={onRetry}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
  });

  it('oferece navegação segura para autorização e recurso ausente', () => {
    const onNavigate = vi.fn();
    const presentation = presentError(
      createApplicationError({
        category: 'not_found',
        message: 'SENTINELA_REMOTA',
        retryable: false,
      }),
      OPERATION_IDS.productById
    );

    render(<ErrorFeedback presentation={presentation} onNavigate={onNavigate} />);

    const navigate = screen.getByRole('button', { name: 'Voltar' });
    fireEvent.click(navigate);
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
