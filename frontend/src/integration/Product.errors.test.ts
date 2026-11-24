import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getAllProducts } from './Product';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Product: erros de integração', () => {
  beforeEach(() => {
  });

  it('preserva uma lista de produtos bem-sucedida', async () => {
    const products = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1,
      nomeProduto: `Produto ${index + 1}`,
    }));
    const receivedPages: number[] = [];
    establishTestSession();
    server.use(http.get(`${API_ORIGIN}/Produtos`, ({ request }) => {
      const url = new URL(request.url);
      const pagina = Number(url.searchParams.get('pagina'));
      const tamanhoPagina = Number(url.searchParams.get('tamanhoPagina'));
      receivedPages.push(pagina);
      const start = (pagina - 1) * tamanhoPagina;
      return HttpResponse.json({
        itens: products.slice(start, start + tamanhoPagina),
        pagina,
        tamanhoPagina,
        totalItens: products.length,
        totalPaginas: Math.ceil(products.length / tamanhoPagina),
      });
    }));

    await expect(getAllProducts()).resolves.toEqual(products);
    expect(receivedPages).toEqual([1, 2]);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    establishTestSession();
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

  it('deixa a ausência da sessão ser recusada pela API', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Produtos`, () => new HttpResponse(null, { status: 401 }))
    );
    const error = await getAllProducts().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', status: 401 });
  });
});
