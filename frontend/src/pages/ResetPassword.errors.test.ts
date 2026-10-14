import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { resetPassword } from '@/integration/Auth';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

const resetData = {
  email: 'usuario@example.org',
  token: 'codigo-seguro',
  newPassword: 'nova-senha-valida',
  confirmation: 'nova-senha-valida',
};

describe('ResetPassword HTTP errors', () => {
  it('preserva o código conhecido de token no contrato normalizado', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Email/reset-password`, async ({ request }) => {
        expect(await request.json()).toMatchObject({ code: 'codigo-seguro' });
        return HttpResponse.json(
          {
            errors: {
              code: ['password_reset_invalid'],
            },
          },
          { status: 400 }
        );
      })
    );

    const error = await resetPassword(resetData).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 400,
      code: 'password_reset_invalid',
      fieldErrors: {
        token: ['O código de redefinição é inválido ou expirou.'],
      },
    });
  });

  it('normaliza o 429 da redefinicao com o Retry-After da resposta', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Email/reset-password`, () =>
        HttpResponse.json(
          {
            code: 'authentication_rate_limited',
            retryAfterSeconds: 91,
            message: 'nao expor detalhe remoto',
          },
          { status: 429, headers: { 'Retry-After': '17' } }
        )
      )
    );

    const error = await resetPassword(resetData).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'rate_limited',
      status: 429,
      retryAfterSeconds: 17,
    });
    expect(JSON.stringify(error)).not.toContain('nao expor detalhe remoto');
  });
});
