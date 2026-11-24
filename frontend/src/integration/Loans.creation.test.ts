import { establishTestSession } from '@/test/session';
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
    establishTestSession();
  });

  it('envia o corpo conhecido com prova CSRF e sem bearer', async () => {
    let receivedBody: unknown;
    let authorization: string | null = null;
    let csrfToken: string | null = null;
    server.use(
      http.post(`${API_ORIGIN}/Emprestimos`, async ({ request }) => {
        receivedBody = await request.json();
        authorization = request.headers.get('authorization');
        csrfToken = request.headers.get('x-csrf-token');
        return HttpResponse.json({ id: 101 }, { status: 201 });
      })
    );

    await expect(createLoan(payload)).resolves.toMatchObject({ status: 201 });

    expect(receivedBody).toEqual(payload);
    expect(authorization).toBeNull();
    expect(csrfToken).toBe('test-session-bound-proof');
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

  it('preserva o código de domínio da validação de saldo para o formulário', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Emprestimos`, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Dados do empréstimo inválidos.',
            status: 400,
            errors: {
              'produtos[0].quantidade': [
                'A quantidade solicitada excede o saldo disponível.',
              ],
            },
            code: 'loan_insufficient_stock',
          },
          { status: 400 }
        )
      )
    );

    await expect(createLoan(payload)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 400,
      code: 'loan_insufficient_stock',
    });
  });

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

  it('deixa a sessão ausente ser recusada pela API', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Emprestimos`, () =>
        new HttpResponse(null, { status: 401 })
      )
    );

    await expect(createLoan(payload)).rejects.toMatchObject({ status: 401 });
  });
});
