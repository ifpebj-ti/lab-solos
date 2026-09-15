import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getLoansByClass, getLoansByDependentes } from './Class';
import { server } from '@/test/msw/server';
import { loanListFixture } from '@/test/fixtures/loan';

const API_ORIGIN = 'http://localhost:8080/api';
const loansByClassPath = `${API_ORIGIN}/Usuarios/7/dependentes/emprestimos`;

describe('Class: contrato de empréstimos', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', '7');
  });

  it('rejeita resposta incompatível ao consultar uma turma por ID', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/8/dependentes/emprestimos`, () =>
        HttpResponse.json([{ id: 8, status: 'Pendente', produtos: [] }])
      )
    );

    await expect(getLoansByClass({ id: 8 })).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'unknown',
    });
  });

  it('valida empréstimos da turma e preserva coleção vazia', async () => {
    server.use(http.get(loansByClassPath, () => HttpResponse.json(loanListFixture)));

    await expect(getLoansByDependentes()).resolves.toEqual(loanListFixture);

    server.use(
      http.get(`${API_ORIGIN}/Usuarios/8/dependentes/emprestimos`, () =>
        HttpResponse.json([])
      )
    );

    await expect(getLoansByClass({ id: 8 })).resolves.toEqual([]);
  });

  it('rejeita resposta de empréstimos com campos divergentes', async () => {
    server.use(
      http.get(loansByClassPath, () =>
        HttpResponse.json([{ id: 7, status: 'Pendente', produtos: [] }])
      )
    );

    await expect(getLoansByDependentes()).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'unknown',
    });
  });

  it.each([
    [403, 'authorization'],
    [404, 'not_found'],
    [500, 'server'],
  ] as const)('preserva erro HTTP %s da turma', async (status, category) => {
    server.use(
      http.get(loansByClassPath, () => new HttpResponse(null, { status }))
    );

    await expect(getLoansByDependentes()).rejects.toMatchObject({
      name: 'ApplicationError',
      category,
      status,
    });
  });
});
