import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';

import { approveDependente } from './Class';

const API_ORIGIN = 'http://localhost:8080/api';
const approverId = 42;
const dependentId = 11;

const approvalResponse = {
  Message: 'Usuario aprovado com sucesso.',
  Usuario: {
    id: dependentId,
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: null,
    dataIngresso: '2026-09-01',
    status: 'Habilitado',
    nivelUsuario: 'Mentorado',
    cidade: 'Belo Jardim',
    curso: 'ES',
    instituicao: 'IFPE',
  },
};

describe('Class: contrato de aprovacao de cadastro', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', String(approverId));
  });

  it('retorna o contrato Message e Usuario da aprovacao', async () => {
    server.use(
      http.patch(
        `${API_ORIGIN}/Usuarios/dependentes/${dependentId}/aprovar`,
        () => HttpResponse.json(approvalResponse)
      )
    );

    await expect(approveDependente(dependentId)).resolves.toEqual(
      approvalResponse
    );
  });
});
