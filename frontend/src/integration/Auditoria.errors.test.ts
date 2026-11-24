import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  exportarAuditoria,
  marcarLogComoNaoSuspeito,
  marcarLogComoSuspeito,
  obterLogsAuditoria,
} from './Auditoria';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Auditoria: erros de integração', () => {
  beforeEach(() => {
    establishTestSession();
  });

  it('preserva o corpo de sucesso dos logs', async () => {
    const logs = {
      itens: [{ id: 1, codigoEvento: 'FalhaOperacao', acao: 'login' }],
      pagina: 1,
      tamanhoPagina: 25,
      totalItens: 1,
      totalPaginas: 1,
    };
    server.use(
      http.get(`${API_ORIGIN}/Auditoria/logs`, () => HttpResponse.json(logs))
    );

    await expect(obterLogsAuditoria()).resolves.toEqual(logs);
  });

  it('propaga falha HTTP como ApplicationError sem ecoar resposta remota', async () => {
    const secret = 'senha=segredo stack=proibida';
    const debug = vi.spyOn(console, 'debug');
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

  it('deixa a ausência da sessão ser recusada pela API', async () => {
    const debug = vi.spyOn(console, 'debug');
    server.use(
      http.get(`${API_ORIGIN}/Auditoria/logs`, () =>
        new HttpResponse(null, { status: 401 })
      )
    );

    const error = await obterLogsAuditoria().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', status: 401 });
    expect(debug.mock.calls.flat().some((value) => value instanceof Error)).toBe(
      false
    );
  });

  it('mantém os filtros e a página na consulta paginada sem enviar origem bruta', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_ORIGIN}/Auditoria/logs`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json({
          itens: [],
          pagina: 3,
          tamanhoPagina: 25,
          totalItens: 0,
          totalPaginas: 0,
        });
      })
    );

    await obterLogsAuditoria({
      dataInicio: '2026-11-01',
      dataFim: '2026-11-20',
      tipoAcao: 'Login',
      nivelRisco: 'Alto',
      apenasSuspeitas: true,
      recurso: 'Produto',
      pagina: 3,
      tamanhoPagina: 25,
      enderecoIP: '192.0.2.7',
    } as Parameters<typeof obterLogsAuditoria>[0]);

    expect(requestUrl?.searchParams.get('dataInicio')).toBe('2026-11-01');
    expect(requestUrl?.searchParams.get('dataFim')).toBe('2026-11-20');
    expect(requestUrl?.searchParams.get('tipoAcao')).toBe('Login');
    expect(requestUrl?.searchParams.get('nivelRisco')).toBe('Alto');
    expect(requestUrl?.searchParams.get('apenasSuspeitas')).toBe('true');
    expect(requestUrl?.searchParams.get('recurso')).toBe('Produto');
    expect(requestUrl?.searchParams.get('pagina')).toBe('3');
    expect(requestUrl?.searchParams.get('tamanhoPagina')).toBe('25');
    expect(requestUrl?.searchParams.has('enderecoIP')).toBe(false);
  });

  it('exporta o recorte filtrado como arquivo CSV', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_ORIGIN}/Auditoria/exportar`, ({ request }) => {
        requestUrl = new URL(request.url);
        return new HttpResponse('evento,resultado\nLogin,Sucesso', {
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        });
      })
    );
    const result = await exportarAuditoria({
      dataInicio: '2026-11-01',
      recurso: 'Produto',
      apenasSuspeitas: true,
      pagina: 4,
      tamanhoPagina: 25,
    });

    expect(requestUrl?.searchParams.get('dataInicio')).toBe('2026-11-01');
    expect(requestUrl?.searchParams.get('recurso')).toBe('Produto');
    expect(requestUrl?.searchParams.get('apenasSuspeitas')).toBe('true');
    expect(requestUrl?.searchParams.has('pagina')).toBe(false);
    expect(requestUrl?.searchParams.has('tamanhoPagina')).toBe(false);
    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThan(0);
  });

  it('envia revisão esperada e justificativa ao reclassificar', async () => {
    let body: unknown;
    server.use(
      http.patch(
        `${API_ORIGIN}/Auditoria/marcar-nao-suspeito/42`,
        async ({ request }) => {
          body = await request.json();
          return new HttpResponse(null, { status: 204 });
        }
      )
    );

    await marcarLogComoNaoSuspeito(42, {
      revisaoEsperada: 2,
      justificativa: 'Revisão confirmada.',
    });

    expect(body).toEqual({
      revisaoEsperada: 2,
      justificativa: 'Revisão confirmada.',
    });
  });

  it('envia a mesma estrutura de revisão para classificar como suspeito', async () => {
    let body: unknown;
    server.use(
      http.patch(
        `${API_ORIGIN}/Auditoria/marcar-suspeito/42`,
        async ({ request }) => {
          body = await request.json();
          return new HttpResponse(null, { status: 204 });
        }
      )
    );

    await marcarLogComoSuspeito(42, {
      revisaoEsperada: 1,
      justificativa: 'Padrão confirmado.',
    });

    expect(body).toEqual({
      revisaoEsperada: 1,
      justificativa: 'Padrão confirmado.',
    });
  });
});
