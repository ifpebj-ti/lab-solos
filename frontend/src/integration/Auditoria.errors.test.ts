import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obterLogsAuditoria } from './Auditoria';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Auditoria: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
  });

  it('preserva o corpo de sucesso dos logs', async () => {
    const logs = [{ id: 1, acao: 'login' }];
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Auditoria/logs`, () => HttpResponse.json(logs))
    );

    await expect(obterLogsAuditoria()).resolves.toEqual(logs);
  });

  it('propaga falha HTTP como ApplicationError sem ecoar resposta remota', async () => {
    const secret = 'senha=segredo stack=proibida';
    const debug = vi.spyOn(console, 'debug');
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Auditoria/logs`, () =>
        HttpResponse.json(
          { message: secret, traceId: 'audit-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await obterLogsAuditoria().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'audit-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain(secret);
    expect(JSON.stringify(debug.mock.calls)).not.toContain(secret);
  });

  it('normaliza rejeição local e não registra Error bruto', async () => {
    const debug = vi.spyOn(console, 'debug');

    const error = await obterLogsAuditoria().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
    expect(String(error)).not.toContain('Usuário não autenticado');
    expect(debug.mock.calls.flat().some((value) => value instanceof Error)).toBe(
      false
    );
  });
});
