import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { getAllLoans, getLoansById, getLoansByUserId } from './Loans';
import { server } from '@/test/msw/server';
import { loanFixture, loanListFixture } from '@/test/fixtures/loan';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Loans: contrato de resposta', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
  });

  it('valida lista real e preserva lista vazia', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/7`, () =>
        HttpResponse.json(loanListFixture)
      )
    );

    await expect(getLoansByUserId({ id: 7 })).resolves.toEqual(loanListFixture);

    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/8`, () =>
        HttpResponse.json([])
      )
    );

    await expect(getLoansByUserId({ id: 8 })).resolves.toEqual([]);
  });

  it('exige objeto válido no detalhe', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/42`, () =>
        HttpResponse.json(loanFixture)
      )
    );

    await expect(getLoansById({ id: 42 })).resolves.toEqual(loanFixture);
  });

  it('valida a lista global e preserva lista vazia', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos`, () => HttpResponse.json([]))
    );

    await expect(getAllLoans()).resolves.toEqual([]);

    server.use(
      http.get(`${API_ORIGIN}/Emprestimos`, () =>
        HttpResponse.json([{ ...loanFixture, produtos: undefined }])
      )
    );

    await expect(getAllLoans()).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'unknown',
    });
  });

  it('transforma payload incompatível em erro contextual', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/7`, () =>
        HttpResponse.json([{ ...loanFixture, produtos: undefined }])
      )
    );

    await expect(getLoansByUserId({ id: 7 })).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'unknown',
    });
  });

  it.each([
    [403, 'authorization'],
    [404, 'not_found'],
    [500, 'server'],
  ] as const)('não converte HTTP %s em lista vazia', async (status, category) => {
    server.use(
      http.get(`${API_ORIGIN}/Emprestimos/usuario/7`, () =>
        new HttpResponse(null, { status })
      )
    );

    await expect(getLoansByUserId({ id: 7 })).rejects.toMatchObject({
      name: 'ApplicationError',
      category,
      status,
    });
  });
});
