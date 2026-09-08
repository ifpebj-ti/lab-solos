import { describe, expect, it } from 'vitest';

import {
  isApplicationError,
  type ApplicationError,
  type ErrorCategory,
} from './applicationError';

describe('isApplicationError', () => {
  it('reconhece o contrato tipado e rejeita valores parecidos incompletos', () => {
    const categories: ErrorCategory[] = [
      'validation',
      'authentication',
      'authorization',
      'not_found',
      'conflict',
      'network',
      'timeout',
      'server',
      'unknown',
    ];
    const error: ApplicationError = {
      name: 'ApplicationError',
      category: 'unknown',
      message: 'Mensagem local.',
      retryable: false,
    };

    expect(isApplicationError(error)).toBe(true);
    expect(categories.every((category) =>
      isApplicationError({ ...error, category })
    )).toBe(true);
    expect(isApplicationError({ ...error, name: 'Error' })).toBe(false);
    expect(isApplicationError({ ...error, category: 'server-error' })).toBe(
      false
    );
    expect(isApplicationError({ ...error, retryable: 'yes' })).toBe(false);
    expect(isApplicationError(null)).toBe(false);
    expect(isApplicationError('ApplicationError')).toBe(false);
  });

  it('valida status, referência e erros de campo quando presentes', () => {
    const base: ApplicationError = {
      name: 'ApplicationError',
      category: 'validation',
      message: 'Mensagem local.',
      retryable: false,
    };

    expect(
      isApplicationError({
        ...base,
        status: 400,
        requestId: 'trace-123',
        fieldErrors: { email: ['Informe um e-mail válido.'] },
      })
    ).toBe(true);
    expect(isApplicationError({ ...base, status: 99 })).toBe(false);
    expect(isApplicationError({ ...base, requestId: 123 })).toBe(false);
    expect(isApplicationError({ ...base, requestId: 'trace id' })).toBe(false);
    expect(
      isApplicationError({ ...base, fieldErrors: { email: ['ok', 42] } })
    ).toBe(false);
  });
});
