import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getDependentesForApproval,
  getRegisteredUsers,
  getUserForMentoring,
} from './Users';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Users: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
  });

  it('preserva uma lista de usuários bem-sucedida', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () => HttpResponse.json([]))
    );

    await expect(getRegisteredUsers()).resolves.toEqual([]);
  });

  it('expõe o adaptador específico da projeção de acompanhamento', async () => {
    const accompaniment = {
      id: 12,
      nomeCompleto: 'Ada Lovelace',
      email: 'ada@example.com',
      telefone: null,
      dataIngresso: '2024-02-29',
      instituicao: null,
      cidade: 'Belo Jardim',
      curso: 'ES',
      status: 'Habilitado',
      nivelUsuario: 'Mentorado',
    };
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/12`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer session-token');
        return HttpResponse.json(accompaniment);
      })
    );

    await expect(getUserForMentoring({ id: 12 })).resolves.toEqual(accompaniment);
  });

  it('propaga 404 da consulta protegida de pendências', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(
        `${API_ORIGIN}/Usuarios/42/dependentes/aprovacao`,
        () => new HttpResponse(null, { status: 404 })
      )
    );

    await expect(getDependentesForApproval(42)).rejects.toMatchObject({
      name: 'ApplicationError',
      category: 'not_found',
      status: 404,
    });
  });

  it('mantém uma lista autorizada vazia de pendências como resultado válido', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(
        `${API_ORIGIN}/Usuarios/42/dependentes/aprovacao`,
        () => HttpResponse.json([])
      )
    );

    await expect(getDependentesForApproval(42)).resolves.toEqual([]);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () =>
        HttpResponse.json(
          { message: 'senha=segredo', traceId: 'users-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await getRegisteredUsers().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'users-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('normaliza rejeição local de autenticação', async () => {
    const error = await getRegisteredUsers().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
  });
});
