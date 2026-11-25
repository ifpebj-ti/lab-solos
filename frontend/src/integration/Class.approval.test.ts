import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { establishTestSession } from '@/test/session';

import { approveDependente, getAllUsersForApproval, getDependentesForApproval } from './Class';

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

const approvalRequest = {
  id: dependentId,
  nomeCompleto: 'Ana Silva',
  email: 'ana@example.invalid',
  telefone: null,
  dataIngresso: '2026-09-01',
  status: 'Pendente',
  tipoUsuario: 'Academico',
  nivelUsuario: 'Mentorado',
  cidade: 'Belo Jardim',
  curso: 'ES',
  instituicao: 'IFPE',
};

describe('Class: contrato de aprovacao de cadastro', () => {
  beforeEach(() => {
    establishTestSession(String(approverId), 'Mentor');
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

  it('preserva tipo e papel efetivo na fila de mentorados vinculados', async () => {
    server.use(
      http.get(
        `${API_ORIGIN}/Usuarios/${approverId}/dependentes/aprovacao`,
        () => HttpResponse.json([approvalRequest])
      )
    );

    await expect(getDependentesForApproval(String(approverId))).resolves.toEqual(
      [approvalRequest]
    );
  });

  it('preserva tipo e papel efetivo na fila administrativa', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/aprovacao`, () =>
        HttpResponse.json([approvalRequest])
      )
    );

    await expect(getAllUsersForApproval()).resolves.toEqual([approvalRequest]);
  });
});
