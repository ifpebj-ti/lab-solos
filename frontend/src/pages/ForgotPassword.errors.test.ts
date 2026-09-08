import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { requestPasswordReset } from '@/integration/Auth';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('ForgotPassword HTTP errors', () => {
  it('mantém o contrato 202 sem depender do corpo da resposta', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Email/request-password-reset`, () =>
        HttpResponse.json(
          { message: 'SENTINELA_NAO_ENUMERAR_CONTA' },
          { status: 202 }
        )
      )
    );

    const response = await requestPasswordReset({
      email: 'usuario@example.org',
    });

    expect(response.status).toBe(202);
  });

  it('normaliza falha legada sem transformar mensagem remota em feedback', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Email/request-password-reset`, () =>
        HttpResponse.json(
          { Message: 'SENTINELA_SENHA_TOKEN_STACK' },
          { status: 503 }
        )
      )
    );

    const error = await requestPasswordReset({
      email: 'usuario@example.org',
    }).catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'server',
      status: 503,
      retryable: true,
    });
    expect(JSON.stringify(error)).not.toContain('SENTINELA');
  });
});
