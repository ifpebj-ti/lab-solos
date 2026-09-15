import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';

import { approveLoan, rejectLoan } from './Loans';

const API_ORIGIN = 'http://localhost:8080/api';
const loanId = 71;
const approverId = 12;

const decisions = [
  ['aprovar', 'aprovar', approveLoan],
  ['rejeitar', 'reprovar', rejectLoan],
] as const;

const decisionUrl = (action: (typeof decisions)[number][1]) =>
  `${API_ORIGIN}/Emprestimos/${action}/${loanId}`;

describe('Loans: contrato de decisao administrativa', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', String(approverId));
  });

  it.each(decisions)(
    'envia ID, metodo PATCH, sessao e aprovadorId ao %s',
    async (_label, action, mutate) => {
      let receivedBody: unknown;
      let receivedMethod: string | undefined;
      let receivedUrl: string | undefined;

      server.use(
        http.patch(
          decisionUrl(action),
          async ({ request }) => {
            receivedBody = await request.json();
            receivedMethod = request.method;
            receivedUrl = request.url;
            expect(request.headers.get('authorization')).toBe(
              'Bearer session-token'
            );
            return new HttpResponse(null, { status: 204 });
          }
        )
      );

      await expect(mutate(loanId)).resolves.toBe('');

      expect(receivedMethod).toBe('PATCH');
      expect(receivedUrl).toBe(
        decisionUrl(action)
      );
      expect(receivedBody).toEqual({ aprovadorId: approverId });
    }
  );

  it.each([
    [400, 'validation'],
    [403, 'authorization'],
    [404, 'not_found'],
  ] as const)('normaliza a recusa HTTP %s sem sucesso falso', async (status, category) => {
    server.use(
      http.patch(
        `${API_ORIGIN}/Emprestimos/aprovar/${loanId}`,
        () => HttpResponse.json({ detail: 'DECISION_SECRET' }, { status })
      )
    );

    await expect(approveLoan(loanId)).rejects.toMatchObject({
      name: 'ApplicationError',
      category,
      status,
    });
  });

  it('normaliza falha de rede como erro retentavel', async () => {
    server.use(
      http.patch(
        `${API_ORIGIN}/Emprestimos/reprovar/${loanId}`,
        () => HttpResponse.error()
      )
    );

    await expect(rejectLoan(loanId)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'network',
      retryable: true,
    });
  });

  it.each(decisions)('exige sessao e aprovador para %s', async (_label, _action, mutate) => {
    Cookie.remove('doorKey');
    await expect(mutate(loanId)).rejects.toMatchObject({
      name: 'ApplicationError',
    });

    Cookie.set('doorKey', 'session-token');
    Cookie.remove('rankID');
    await expect(mutate(loanId)).rejects.toMatchObject({
      name: 'ApplicationError',
    });
  });
});
