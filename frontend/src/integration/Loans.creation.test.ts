import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { createLoan } from './Loans';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

const payload = {
  diasParaDevolucao: 5,
  produtos: [{ produtoId: 11, quantidade: 2 }],
};

describe('Loans: contrato de criação', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
  });

  it('envia o corpo conhecido e a sessão existente', async () => {
    let receivedBody: unknown;
    let authorization: string | null = null;
    server.use(
      http.post(`${API_ORIGIN}/Emprestimos`, async ({ request }) => {
        receivedBody = await request.json();
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ id: 101 }, { status: 201 });
      })
    );

    await expect(createLoan(payload)).resolves.toMatchObject({ status: 201 });

    expect(receivedBody).toEqual(payload);
    expect(authorization).toBe('Bearer session-token');
  });

  it.each([400, 403, 500])(
    'propaga a recusa HTTP %s como erro contextual sem sucesso falso',
    async (status) => {
      server.use(
        http.post(
          `${API_ORIGIN}/Emprestimos`,
          () => new HttpResponse(null, { status })
        )
      );

      await expect(createLoan(payload)).rejects.toMatchObject({
        name: 'ApplicationError',
        status,
      });
    }
  );

  it('normaliza indisponibilidade da API como falha retentável', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Emprestimos`, () => HttpResponse.error())
    );

    await expect(createLoan(payload)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'network',
      retryable: true,
    });
  });

  it('recusa a criação local quando a sessão não existe', async () => {
    Cookie.remove('doorKey');

    await expect(createLoan(payload)).rejects.toMatchObject({
      name: 'ApplicationError',
    });
  });
});
