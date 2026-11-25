import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { clearSession } from '@/auth/session';
import { getAdminProductCatalog } from './Product';

const API_ORIGIN = 'http://localhost:8080/api';
const catalog = [
  {
    id: 1,
    nomeProduto: 'Béquer',
    tipoProduto: 'Vidraria',
    quantidade: 3,
    quantidadeMinima: 2,
    unidadeMedida: 'unidade',
    capacidadeMl: 250,
    motivosAlerta: [],
  },
  {
    id: 2,
    nomeProduto: 'Pipeta',
    tipoProduto: 'Vidraria',
    quantidade: 1,
    quantidadeMinima: 2,
    unidadeMedida: 'unidade',
    capacidadeMl: null,
    motivosAlerta: ['estoque_abaixo_minimo'],
  },
  {
    id: 3,
    nomeProduto: 'Reagente',
    tipoProduto: 'Quimico',
    quantidade: 3,
    quantidadeMinima: 2,
    unidadeMedida: 'l',
    capacidadeMl: null,
    motivosAlerta: ['validade'],
  },
  {
    id: 4,
    nomeProduto: 'Balão',
    tipoProduto: 'Vidraria',
    quantidade: 0,
    quantidadeMinima: 1,
    unidadeMedida: 'unidade',
    capacidadeMl: 500,
    motivosAlerta: ['estoque_abaixo_minimo', 'validade'],
  },
];

describe('Product: catálogo administrativo de alertas', () => {
  beforeEach(() => establishTestSession());

  it('consome a projeção tipada e envia somente a prova CSRF, sem bearer', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${API_ORIGIN}/Produtos/catalogo-administrativo`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({
          itens: catalog,
          pagina: 1,
          tamanhoPagina: 100,
          totalItens: catalog.length,
          totalPaginas: 1,
        });
      })
    );

    await expect(getAdminProductCatalog()).resolves.toEqual(catalog);
    expect(authorization).toBeNull();
  });

  it('preserva uma recusa de autorização sem transformar em lista vazia', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Produtos/catalogo-administrativo`, () =>
        HttpResponse.json({ code: 'access_denied' }, { status: 403 })
      )
    );

    await expect(getAdminProductCatalog()).rejects.toMatchObject({
      category: 'authorization',
      status: 403,
    });
  });

  it('deixa a sessão ausente ser recusada pela API', async () => {
    clearSession();
    server.use(
      http.get(`${API_ORIGIN}/Produtos/catalogo-administrativo`, () =>
        new HttpResponse(null, { status: 401 })
      )
    );

    await expect(getAdminProductCatalog()).rejects.toMatchObject({ status: 401 });
  });
});
