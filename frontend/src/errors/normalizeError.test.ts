import axios, { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { normalizeError } from './normalizeError';

describe('normalizeError', () => {
  it.each([
    [400, 'validation', false],
    [422, 'validation', false],
    [401, 'authentication', false],
    [403, 'authorization', false],
    [404, 'not_found', false],
    [409, 'conflict', false],
    [500, 'server', true],
    [599, 'server', true],
    [418, 'unknown', false],
  ] as const)('classifica status %s como %s', (status, category, retryable) => {
    const result = normalizeError({
      response: {
        status,
        data: { status: 599, message: 'resposta remota secreta' },
      },
    });

    expect(result.category).toBe(category);
    expect(result.retryable).toBe(retryable);
    expect(result.status).toBe(status);
    expect(result.message).not.toContain('resposta remota secreta');
  });

  it('prioriza o status HTTP sobre o status alegado no corpo', () => {
    const result = normalizeError({
      response: {
        status: 400,
        data: { status: 500, title: 'falha interna remota' },
      },
    });

    expect(result.category).toBe('validation');
    expect(result.message).toBe('Os dados informados precisam de revisão.');
  });

  it('classifica timeout, rede e rejeição desconhecida sem ecoar a mensagem', () => {
    const timeout = normalizeError(
      new AxiosError('senha=segredo', 'ECONNABORTED')
    );
    const network = normalizeError(new AxiosError('token=segredo', 'ERR_NETWORK'));
    const unknown = normalizeError(new Error('stack e payload secretos'));

    expect(timeout.category).toBe('timeout');
    expect(timeout.retryable).toBe(true);
    expect(network.category).toBe('network');
    expect(network.retryable).toBe(true);
    expect(unknown.category).toBe('unknown');
    expect(unknown.retryable).toBe(false);
    expect(JSON.stringify({ timeout, network, unknown })).not.toContain(
      'segredo'
    );
  });

  it('extrai somente código, campos e referência permitidos', () => {
    const remoteSecret = 'senha=segredo stack=proibida';
    const result = normalizeError({
      response: {
        status: 400,
        headers: {
          'x-correlation-id': 'correlation-id',
          'x-request-id': 'request-id',
        },
        data: {
          code: 'password_common',
          traceId: 'trace-id',
          message: remoteSecret,
          errors: {
            newPassword: ['password_common', remoteSecret],
            unknownField: ['current_password_invalid'],
          },
        },
      },
    });

    expect(result.code).toBe('password_common');
    expect(result.requestId).toBe('trace-id');
    expect(result.fieldErrors).toEqual({
      newPassword: ['Esta senha é muito comum. Escolha outra.'],
    });
    expect(result.message).toBe('Os dados informados precisam de revisão.');
    expect(JSON.stringify(result)).not.toContain(remoteSecret);
    expect(JSON.stringify(result)).not.toContain('unknownField');
  });

  it('usa a precedência de referência e descarta candidatos inválidos', () => {
    const correlation = normalizeError({
      response: {
        status: 503,
        headers: {
          'x-correlation-id': 'correlation-id',
          'x-request-id': 'request-id',
        },
        data: { traceId: 'trace id with spaces' },
      },
    });
    const request = normalizeError({
      response: {
        status: 503,
        headers: { 'x-request-id': 'request-id' },
        data: { traceId: 'x'.repeat(129) },
      },
    });

    expect(correlation.requestId).toBe('correlation-id');
    expect(request.requestId).toBe('request-id');
  });

  it('normaliza ValidationProblemDetails e ModelState com fallback local', () => {
    const validationProblem = normalizeError({
      response: {
        status: 422,
        data: {
        errors: {
          currentPassword: ['current_password_invalid'],
          confirmation: ['codigo-legado-desconhecido'],
          code: ['password_reset_invalid'],
          '__proto__': ['password_common'],
          },
        },
      },
    });
    const modelState = normalizeError({
      response: {
        status: 400,
        data: {
          ModelState: {
            cidade: ['mensagem livre'],
            curso: ['mensagem livre'],
            ignored: ['segredo'],
          },
        },
      },
    });

    expect(validationProblem.fieldErrors).toEqual({
      currentPassword: ['A senha atual está incorreta.'],
      confirmation: ['Verifique este campo.'],
      token: ['O código de redefinição é inválido ou expirou.'],
    });
    expect(modelState.fieldErrors).toEqual({
      cidade: ['Verifique este campo.'],
      curso: ['Verifique este campo.'],
    });
    expect(validationProblem.code).toBe('current_password_invalid');
    expect(JSON.stringify(modelState)).not.toContain('mensagem livre');
  });

  it('é idempotente para um ApplicationError já normalizado', () => {
    const normalized = normalizeError({
      response: { status: 404, data: { traceId: 'abc-123' } },
    });

    expect(normalizeError(normalized)).toBe(normalized);
  });

  it('cai em unknown se o parsing de uma rejeição malformada falhar', () => {
    const malformed = {};
    Object.defineProperty(malformed, 'response', {
      get() {
        throw new Error('getter secreto');
      },
    });

    const result = normalizeError(malformed);

    expect(result.category).toBe('unknown');
    expect(result.message).toBe('Não foi possível concluir a operação.');
  });

  it('reconhece a marca Axios apenas para diferenciar falha de rede', () => {
    const result = normalizeError({
      isAxiosError: true,
      request: {},
      message: 'conteúdo sensível',
    });

    expect(axios.isAxiosError(result)).toBe(false);
    expect(result.category).toBe('network');
  });
});
