import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';

import AllLoans from './AllLoans';

const API_ORIGIN = 'http://localhost:8080/api';
const loansUrl = `${API_ORIGIN}/Emprestimos`;
const sessionToken =
  'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIiwicm9sZSI6IkFkbWluaXN0cmFkb3IifQ.signature';

const loan = {
  id: 3001,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: '',
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [{ id: 1 }],
  solicitante: { id: 1, nomeCompleto: 'Solicitante', email: 'a@test.invalid' },
  aprovador: { id: 2, nomeCompleto: 'Responsável', email: 'b@test.invalid' },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AllLoans />
    </MemoryRouter>
  );

describe('AllLoans: estados de consulta', () => {
  beforeEach(() => {
    Cookie.set('doorKey', sessionToken);
  });

  afterEach(() => {
    Cookie.remove('doorKey');
  });

  it('distingue uma resposta vazia de uma falha', async () => {
    server.use(http.get(loansUrl, () => HttpResponse.json([])));

    renderPage();

    expect(await screen.findByText('Nenhum empréstimo registrado no sistema.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Erro durante requisição.')).not.toBeInTheDocument();
  });

  it.each([
    [400, 'validation'],
    [404, 'not_found'],
    [409, 'conflict'],
    [500, 'server'],
  ] as const)('apresenta a categoria HTTP %s sem confundir falha com vazio', async (status, category) => {
    server.use(
      http.get(loansUrl, () =>
        HttpResponse.json(
          { detail: 'SENTINELA_REMOTA', traceId: `loans-ref-${status}` },
          { status }
        )
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os empréstimos');
    expect(feedback).toHaveTextContent(ERROR_CATALOG[category].message);
    expect(feedback).toHaveTextContent(ERROR_CATALOG[category].suggestedAction);
    expect(feedback).toHaveTextContent(`Código de referência: loans-ref-${status}`);
    expect(feedback).not.toHaveTextContent('SENTINELA_REMOTA');
    expect(feedback).not.toHaveTextContent('Nenhum empréstimo registrado no sistema.');
  });

  it('mantém a sessão e apresenta autorização com navegação segura', async () => {
    server.use(
      http.get(loansUrl, () =>
        HttpResponse.json(
          { detail: 'SENTINELA_REMOTA', traceId: 'loans-ref-403' },
          { status: 403 }
        )
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.authorization.message);
    expect(feedback).toHaveTextContent('Voltar');
    expect(feedback).not.toHaveTextContent('SENTINELA_REMOTA');
    expect(Cookie.get('doorKey')).toBe(sessionToken);
  });

  it('repete a consulta e substitui o feedback por dados recuperados', async () => {
    let attempts = 0;
    server.use(
      http.get(loansUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ traceId: 'loans-ref-500' }, { status: 500 })
          : HttpResponse.json([loan]);
      })
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.server.message);

    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    expect(await screen.findByRole('list', { name: 'Todos os empréstimos' })).toBeInTheDocument();
    expect(screen.getAllByText('Solicitante').length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('mantém o mesmo feedback quando a repetição falha novamente', async () => {
    let attempts = 0;
    server.use(
      http.get(loansUrl, () => {
        attempts += 1;
        return HttpResponse.json(
          { traceId: `loans-ref-${attempts}` },
          { status: 500 }
        );
      })
    );

    renderPage();

    const firstFeedback = await screen.findByRole('alert');
    expect(firstFeedback).toHaveTextContent('Código de referência: loans-ref-1');

    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    await waitFor(() => {
      const secondFeedback = screen.getByRole('alert');
      expect(secondFeedback).toHaveTextContent(ERROR_CATALOG.server.message);
      expect(secondFeedback).toHaveTextContent('Código de referência: loans-ref-2');
      expect(secondFeedback).not.toHaveTextContent('Nenhum empréstimo registrado no sistema.');
    });
    expect(attempts).toBe(2);
  });

  it('classifica falha de rede sem expor detalhes técnicos', async () => {
    server.use(http.get(loansUrl, () => HttpResponse.error()));

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.network.message);
    expect(feedback).toHaveTextContent(ERROR_CATALOG.network.suggestedAction);
    expect(feedback).not.toHaveTextContent('TypeError');
    expect(feedback).not.toHaveTextContent('Failed to fetch');
  });
});
