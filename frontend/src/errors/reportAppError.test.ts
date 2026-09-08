import { describe, expect, it, vi } from 'vitest';

import { reportAppError } from './reportAppError';

describe('reportAppError', () => {
  it('registra somente metadados permitidos em desenvolvimento', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    const result = reportAppError(
      {
        response: {
          status: 503,
          data: {
            code: 'credential_concurrency_conflict',
            traceId: 'trace-123',
            message: 'token=segredo stack=segredo',
          },
        },
      },
      'users.list'
    );

    expect(result.category).toBe('server');
    expect(debug).toHaveBeenCalledWith('Application error', {
      category: 'server',
      status: 503,
      code: 'credential_concurrency_conflict',
      requestId: 'trace-123',
      operation: 'users.list',
    });
    expect(JSON.stringify(debug.mock.calls)).not.toContain('segredo');
  });

  it('é no-op em produção, mas ainda devolve o erro normalizado', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    const result = reportAppError(new Error('payload remoto secreto'), 'auth.login');

    expect(result.category).toBe('unknown');
    expect(debug).not.toHaveBeenCalled();
  });
});
