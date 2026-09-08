import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getLoansByUserId } from './Loans';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Loans: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
  });

  it('preserva uma lista de empréstimos bem-sucedida', async () => {
    const loans = [{ id: 1, status: 'Aprovado' }];
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/42`, () =>
        HttpResponse.json(loans)
      )
    );

    await expect(getLoansByUserId({ id: 42 })).resolves.toEqual(loans);
  });

  it('propaga validação HTTP sem expor payload remoto', async () => {
    Cookie.set('doorKey', 'session-token');
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

  it('normaliza rejeição local de autenticação', async () => {
    const error = await getLoansByUserId({ id: 42 }).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
  });
});
