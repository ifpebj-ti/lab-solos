import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';

import {
  approveDependente,
  getDependentesForApproval,
  rejectDependente,
} from './Users';

const API_ORIGIN = 'http://localhost:8080/api';
const approverId = 42;
const request = {
  id: 11,
  nomeCompleto: 'Ana Silva',
  email: 'ana@example.invalid',
  telefone: null,
  dataIngresso: '2026-09-01',
  status: 'Pendente' as const,
  nivelUsuario: 'Mentorado' as const,
  cidade: 'Belo Jardim',
  curso: 'ES',
  instituicao: 'IFPE',
};

describe('Users: contrato de aprovação de cadastro', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', String(approverId));
  });

  it('expõe a consulta de pendências com a resposta normalizada', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/${approverId}/dependentes/aprovacao`, () =>
        HttpResponse.json([request])
      )
    );

    await expect(
      getDependentesForApproval(String(approverId))
    ).resolves.toEqual([request]);
  });

  it.each([
    ['aprovar', 'aprovar', approveDependente, { message: 'aprovado' }],
    ['rejeitar', 'rejeitar', rejectDependente, { message: 'rejeitado' }],
  ] as const)(
    'envia ID, método PATCH e aprovadorId ao %s',
    async (_label, action, mutate, response) => {
      let receivedBody: unknown;
      let receivedMethod: string | undefined;
      let receivedUrl: string | undefined;

      server.use(
        http.patch(
          `${API_ORIGIN}/Usuarios/dependentes/:dependenteId/${action}`,
          async ({ request: requestObject }) => {
            receivedBody = await requestObject.json();
            receivedMethod = requestObject.method;
            receivedUrl = requestObject.url;
            return HttpResponse.json(response);
          }
        )
      );

      await expect(mutate(request.id)).resolves.toEqual(response);

      expect(receivedMethod).toBe('PATCH');
      expect(receivedUrl).toBe(
        `${API_ORIGIN}/Usuarios/dependentes/${request.id}/${action}`
      );
      expect(receivedBody).toEqual({ aprovadorId: approverId });
    }
  );

  it('converte uma recusa HTTP em erro de aplicação sem concluir a ação', async () => {
    server.use(
      http.patch(
        `${API_ORIGIN}/Usuarios/dependentes/${request.id}/aprovar`,
        () => HttpResponse.json({ message: 'sem permissão' }, { status: 403 })
      )
    );

    await expect(approveDependente(request.id)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'authorization',
      status: 403,
    });
  });
});
