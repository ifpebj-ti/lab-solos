import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getSystemQuantities } from './System';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('System: erros de integração', () => {
  beforeEach(() => {
  });

  it('retorna somente a projeção aprovada de produtos', async () => {
    const projection = {
      produtos: { Quimico: 2, Vidraria: 1, Outro: 3, Total: 6 },
    };
    establishTestSession();
    server.use(
      http.get(`${API_ORIGIN}/System/quantities`, () =>
        HttpResponse.json({
          ...projection,
          usuarios: { Administrador: 2, Total: 9 },
          emprestimos: { Pendente: 4, Total: 12 },
          totalProdutosEmprestados: 7,
        })
      )
    );

    const response = await getSystemQuantities();

    expect(response.data).toEqual(projection);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    establishTestSession();
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

  it('deixa a ausência da sessão ser recusada pela API', async () => {
    server.use(
      http.get(`${API_ORIGIN}/System/quantities`, () =>
        new HttpResponse(null, { status: 401 })
      )
    );
    const error = await getSystemQuantities().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', status: 401 });
  });
});
