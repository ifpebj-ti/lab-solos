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
      http.post(`${API_ORIGIN}/Email/reset-password`, () =>
        HttpResponse.json(
          {
            errors: {
              code: ['password_reset_invalid'],
            },
          },
          { status: 400 }
        )
      )
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
});
