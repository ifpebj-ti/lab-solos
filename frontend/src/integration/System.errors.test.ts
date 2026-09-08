import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getSystemQuantities } from './System';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('System: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
  });

  it('preserva a resposta completa de quantidades', async () => {
    const quantities = { users: 3, products: 4 };
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/System/quantities`, () =>
        HttpResponse.json(quantities)
      )
    );

    const response = await getSystemQuantities();

    expect(response.data).toEqual(quantities);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/System/quantities`, () =>
        HttpResponse.json(
          { message: 'stack=segredo', traceId: 'system-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await getSystemQuantities().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'system-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('normaliza rejeição local de autenticação', async () => {
    const error = await getSystemQuantities().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
  });
});
