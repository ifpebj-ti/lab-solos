import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAllUsersForApproval,
  getDependentes,
  getDependentesForApproval,
  getDependentesID,
} from './Class';
import { server } from '@/test/msw/server';

const API_ORIGIN = 'http://localhost:8080/api';

describe('Class: erros de integração', () => {
  beforeEach(() => {
    Cookie.remove('doorKey');
    Cookie.remove('rankID');
  });

  it('preserva uma lista de dependentes bem-sucedida', async () => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', '42');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/42/dependentes`, () =>
        HttpResponse.json([])
      )
    );

    await expect(getDependentes()).resolves.toEqual([]);
  });

  it('propaga validação HTTP como ApplicationError', async () => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', '42');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/42/dependentes`, () =>
        HttpResponse.json(
          { message: 'token=segredo senha=segredo', traceId: 'class-ref-422' },
          { status: 422 }
        )
      )
    );

    const error = await getDependentes().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'validation',
      status: 422,
      requestId: 'class-ref-422',
    });
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('normaliza validação local e não registra Error bruto', async () => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', '42');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/42/dependentes`, () =>
        HttpResponse.json({ invalid: true })
      )
    );
    const debug = vi.spyOn(console, 'debug');

    const error = await getDependentes().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'ApplicationError', category: 'unknown' });
    expect(debug.mock.calls.flat().some((value) => value instanceof Error)).toBe(
      false
    );
  });

  it.each([
    ['getDependentesID', '/Usuarios/42/dependentes', () => getDependentesID('42')],
    [
      'getDependentesForApproval',
      '/Usuarios/42/dependentes/aprovacao',
      () => getDependentesForApproval('42'),
    ],
    ['getAllUsersForApproval', '/Usuarios/aprovacao', () => getAllUsersForApproval()],
  ] as const)('declara 404 vazio em %s', async (_operation, path, request) => {
    Cookie.set('doorKey', 'session-token');
    server.use(
      http.get(`${API_ORIGIN}${path}`, () => new HttpResponse(null, { status: 404 }))
    );

    await expect(request()).resolves.toEqual([]);
  });

  it('mantém 404 como not_found nas demais consultas', async () => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', '42');
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/42/dependentes`, () =>
        new HttpResponse(null, { status: 404 })
      )
    );

    const error = await getDependentes().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: 'ApplicationError',
      category: 'not_found',
      status: 404,
    });
  });
});
