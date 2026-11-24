import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getCountNotificacoesNaoLidas,
  getMinhasNotificacoes,
} from './Notifications';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Notifications: erros de integração', () => {
  beforeEach(() => {
  });

  it('preserva uma lista de notificações bem-sucedida', async () => {
    establishTestSession();
    server.use(
      http.get(`${API_ORIGIN}/Notificacoes/minhas`, () => HttpResponse.json([]))
    );

    await expect(getMinhasNotificacoes()).resolves.toEqual([]);
  });

  it('preserva contador zerado quando o destinatário não tem itens não lidos', async () => {
    establishTestSession();
    server.use(
      http.get(`${API_ORIGIN}/Notificacoes/count-nao-lidas`, () =>
        HttpResponse.json({ count: 0 })
      )
    );

    await expect(getCountNotificacoesNaoLidas()).resolves.toEqual({ count: 0 });
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    establishTestSession();
    server.use(
      http.get(`${API_ORIGIN}/Notificacoes/minhas`, () =>
        HttpResponse.json(
          { Message: 'token=segredo', traceId: 'notifications-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await getMinhasNotificacoes().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'notifications-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('deixa a ausência da sessão ser recusada pela API', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Notificacoes/minhas`, () =>
        new HttpResponse(null, { status: 401 })
      )
    );
    const error = await getMinhasNotificacoes().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', status: 401 });
  });
});
