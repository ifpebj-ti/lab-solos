import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getRegisteredUsers } from './Users';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Users: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
  });

  it('preserva uma lista de usuários bem-sucedida', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () => HttpResponse.json([]))
    );

    await expect(getRegisteredUsers()).resolves.toEqual([]);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () =>
        HttpResponse.json(
          { message: 'senha=segredo', traceId: 'users-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await getRegisteredUsers().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'users-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('normaliza rejeição local de autenticação', async () => {
    const error = await getRegisteredUsers().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
  });
});
