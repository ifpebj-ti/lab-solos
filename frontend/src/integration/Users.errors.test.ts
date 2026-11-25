import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getDependentesForApproval,
  getRegisteredUsers,
  getUserForMentoring,
  updateOwnUserProfile,
} from './Users';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Users: erros de integração', () => {
  beforeEach(() => {
  });

  it('preserva uma lista de usuários bem-sucedida', async () => {
    establishTestSession();
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
    establishTestSession();
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/12`, ({ request }) => {
        expect(request.headers.get('authorization')).toBeNull();
        return HttpResponse.json(accompaniment);
      })
    );

    await expect(getUserForMentoring({ id: 12 })).resolves.toEqual(accompaniment);
  });

  it('propaga 404 da consulta protegida de pendências', async () => {
    establishTestSession();
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
    establishTestSession();
    server.use(
      http.get(
        `${API_ORIGIN}/Usuarios/42/dependentes/aprovacao`,
        () => HttpResponse.json([])
      )
    );

    await expect(getDependentesForApproval(42)).resolves.toEqual([]);
  });

  it('propaga validação HTTP sem expor mensagem remota', async () => {
    establishTestSession();
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

  it('deixa a ausência da sessão ser recusada pela API', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () => new HttpResponse(null, { status: 401 }))
    );
    const error = await getRegisteredUsers().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', status: 401 });
  });

  it('preserva o código público de e-mail indisponível sem propagar detalhes remotos', async () => {
    server.use(
      http.patch(`${API_ORIGIN}/Usuarios/7`, () =>
        HttpResponse.json(
          { code: 'profile_update_conflict', title: 'private reservation details' },
          { status: 409 }
        )
      )
    );

    const error = await updateOwnUserProfile({
      userId: 7,
      currentName: 'Ada Lovelace',
      currentEmail: 'ada@example.com',
      currentPhone: null,
      nomeCompleto: 'Ada Lovelace',
      email: 'ada.new@example.com',
      telefone: null,
      currentPassword: 'current-password',
    }).catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'conflict',
      status: 409,
      code: 'profile_update_conflict',
    });
    expect(JSON.stringify(error)).not.toContain('private reservation details');
  });

  it('preserva a categoria de autorização na troca de e-mail', async () => {
    server.use(
      http.patch(`${API_ORIGIN}/Usuarios/7`, () =>
        HttpResponse.json(
          { code: 'forbidden', title: 'private authorization details' },
          { status: 403 }
        )
      )
    );

    const error = await updateOwnUserProfile({
      userId: 7,
      currentName: 'Ada Lovelace',
      currentEmail: 'ada@example.com',
      currentPhone: null,
      nomeCompleto: 'Ada Lovelace',
      email: 'ada.new@example.com',
      telefone: null,
      currentPassword: 'current-password',
    }).catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'authorization',
      status: 403,
    });
    expect(JSON.stringify(error)).not.toContain('private authorization details');
  });
});
