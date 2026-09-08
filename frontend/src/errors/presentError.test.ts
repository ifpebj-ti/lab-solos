import { describe, expect, it, vi } from 'vitest';
import type { MouseEvent } from 'react';

import { createApplicationError } from './applicationError';
import { ERROR_CATALOG, OPERATION_IDS } from './errorCatalog';
import { presentError, notifyError } from './presentError';
import * as toastModule from '@/components/hooks/use-toast';

describe('presentError', () => {
  it('combina a operação ao catálogo e preserva campos e referência seguros', () => {
    const error = createApplicationError({
      category: 'validation',
      message: 'SENTINELA_REMOTA',
      requestId: 'trace-123',
      fieldErrors: {
        email: ['Verifique este campo.'],
      },
      retryable: false,
    });

    expect(presentError(error, OPERATION_IDS.createMentor)).toEqual({
      title: 'Não foi possível cadastrar o usuário',
      description: ERROR_CATALOG.validation.message,
      suggestedAction: ERROR_CATALOG.validation.suggestedAction,
      requestId: 'trace-123',
      fieldErrors: {
        email: ['Verifique este campo.'],
      },
      retryable: false,
    });
  });

  it('não usa a mensagem técnica recebida no erro', () => {
    const error = createApplicationError({
      category: 'server',
      message: 'SENTINELA_TOKEN_SENHA_STACK',
      retryable: true,
    });

    const presentation = presentError(error, OPERATION_IDS.products);

    expect(presentation.title).toContain('carregar os produtos');
    expect(presentation.description).toBe(ERROR_CATALOG.server.message);
    expect(JSON.stringify(presentation)).not.toContain(
      'SENTINELA_TOKEN_SENHA_STACK'
    );
  });
});

describe('notifyError', () => {
  it('envia um toast destrutivo com ação de repetição pertinente', () => {
    const toast = vi.spyOn(toastModule, 'toast').mockReturnValue({
      id: 'toast-1',
      dismiss: vi.fn(),
      update: vi.fn(),
    });
    const onRetry = vi.fn();

    notifyError(
      createApplicationError({
        category: 'network',
        message: 'SENTINELA_REMOTA',
        retryable: true,
        requestId: 'trace-456',
      }),
      OPERATION_IDS.products,
      { onRetry }
    );

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'Não foi possível carregar os produtos',
        description: expect.stringContaining(ERROR_CATALOG.network.message),
      })
    );

    const action = toast.mock.calls[0][0].action;
    expect(action).toBeTruthy();
    expect(action?.props.children).toBe('Tentar novamente');
    action?.props.onClick?.({} as MouseEvent<HTMLButtonElement>);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(JSON.stringify(toast.mock.calls[0][0])).not.toContain(
      'SENTINELA_REMOTA'
    );

    toast.mockRestore();
  });

  it('não adiciona repetição para autorização, mas permite navegação segura', () => {
    const toast = vi.spyOn(toastModule, 'toast').mockReturnValue({
      id: 'toast-2',
      dismiss: vi.fn(),
      update: vi.fn(),
    });
    const onRetry = vi.fn();
    const onNavigate = vi.fn();

    notifyError(
      createApplicationError({
        category: 'authorization',
        message: 'SENTINELA_REMOTA',
        retryable: false,
      }),
      OPERATION_IDS.products,
      { onRetry, onNavigate }
    );

    const action = toast.mock.calls[0][0].action;
    expect(action?.props.children).toBe('Voltar');
    action?.props.onClick?.({} as MouseEvent<HTMLButtonElement>);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();

    toast.mockRestore();
  });
});
