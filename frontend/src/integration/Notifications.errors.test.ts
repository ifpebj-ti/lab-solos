import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getMinhasNotificacoes } from './Notifications';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Notifications: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
  });

  it('preserva uma lista de notificações bem-sucedida', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Notificacoes/minhas`, () => HttpResponse.json([]))
    );

    await expect(getMinhasNotificacoes()).resolves.toEqual([]);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    Cookie.set('doorKey', 'session-token');
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

  it('normaliza rejeição local de autenticação', async () => {
    const error = await getMinhasNotificacoes().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
  });
});
