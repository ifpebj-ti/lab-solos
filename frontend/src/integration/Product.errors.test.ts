import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getAllProducts } from './Product';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Product: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
  });

  it('preserva uma lista de produtos bem-sucedida', async () => {
    const products = [{ id: 1, nomeProduto: 'Béquer' }];
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Produtos`, () => HttpResponse.json(products))
    );

    await expect(getAllProducts()).resolves.toEqual(products);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Produtos`, () =>
        HttpResponse.json(
          { message: 'senha=segredo', traceId: 'product-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await getAllProducts().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'product-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('normaliza rejeição local de autenticação', async () => {
    const error = await getAllProducts().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
  });
});
