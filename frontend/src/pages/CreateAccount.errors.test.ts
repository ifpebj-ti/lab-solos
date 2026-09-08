import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { CreateAcademicUserData } from '@/contracts/userRegistration';
import { isApplicationError } from '@/errors/applicationError';
import { createMentor } from '@/integration/Auth';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

const registration: CreateAcademicUserData = {
  nomeCompleto: 'Maria Silva',
  email: 'maria@example.org',
  senha: 'senha-segura',
  telefone: '81999999999',
  nivelUsuario: 'Mentor',
  tipoUsuario: 'Academico',
  instituicao: 'IFPE',
  cidade: 'Belo Jardim',
  curso: 'Química',
  responsavelEmail: 'mentor@example.org',
};

describe('CreateAccount HTTP errors', () => {
  it('normaliza ValidationProblemDetails e descarta mensagens livres', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Usuarios`, () =>
        HttpResponse.json(
          {
            title: 'SENTINELA_TITULO',
            detail: 'SENTINELA_SENHA_TOKEN_STACK',
            traceId: 'create-account-trace',
            errors: {
              cidade: ['Cidade rejeitada por motivo secreto.'],
              curso: ['Curso rejeitado por motivo secreto.'],
            },
          },
          { status: 422 }
        )
      )
    );

    const error = await createMentor(registration).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'create-account-trace',
      fieldErrors: {
        cidade: ['Verifique este campo.'],
        curso: ['Verifique este campo.'],
      },
    });
    expect(isApplicationError(error)).toBe(true);
    expect(JSON.stringify(error)).not.toContain('SENTINELA');
  });

  it('normaliza resposta legada sem exibir texto arbitrário', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Usuarios`, () =>
        HttpResponse.json(
          { Message: 'SENTINELA_SENHA_TOKEN_STACK' },
          { status: 500 }
        )
      )
    );

    const error = await createMentor(registration).catch(
      (reason: unknown) => reason
    );

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'server',
      status: 500,
      retryable: true,
    });
    expect(JSON.stringify(error)).not.toContain('SENTINELA');
  });

  it('oferece classificação acionável para rede e servidor', async () => {
    server.use(
      http.post(`${API_ORIGIN}/Usuarios`, () => HttpResponse.error())
    );

    const networkError = await createMentor(registration).catch(
      (reason: unknown) => reason
    );
    expect(networkError).toMatchObject({
      name: 'ApplicationError',
      category: 'network',
      retryable: true,
    });

    server.use(
      http.post(`${API_ORIGIN}/Usuarios`, () =>
        HttpResponse.json(
          { message: 'SENTINELA_SERVIDOR' },
          { status: 503 }
        )
      )
    );
    const serverError = await createMentor(registration).catch(
      (reason: unknown) => reason
    );
    expect(serverError).toMatchObject({
      name: 'ApplicationError',
      category: 'server',
      status: 503,
      retryable: true,
    });
    expect(JSON.stringify(serverError)).not.toContain('SENTINELA_SERVIDOR');
  });
});
