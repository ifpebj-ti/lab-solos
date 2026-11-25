import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getLoansByUserId } from './Loans';
import { server } from '@/test/msw/server';
import { loanListFixture } from '@/test/fixtures/loan';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Loans: erros de integração', () => {
  beforeEach(() => {
  });

  it('preserva uma lista de empréstimos bem-sucedida', async () => {
    establishTestSession();
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/42`, () =>
        HttpResponse.json(loanListFixture)
      )
    );

    await expect(getLoansByUserId({ id: 42 })).resolves.toEqual(loanListFixture);
  });

  it('propaga validação HTTP sem expor payload remoto', async () => {
    establishTestSession();
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/42`, () =>
        HttpResponse.json(
          { detail: 'senha=segredo', traceId: 'loans-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await getLoansByUserId({ id: 42 }).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'loans-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('deixa a ausência da sessão ser recusada pela API', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/42`, () =>
        new HttpResponse(null, { status: 401 })
      )
    );
    const error = await getLoansByUserId({ id: 42 }).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({ name: 'ApplicationError', status: 401 });
  });
});
