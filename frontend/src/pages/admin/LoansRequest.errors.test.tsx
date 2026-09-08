import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';

import LoansRequest from './LoansRequest';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';
const loansUrl = `${API_ORIGIN}/Emprestimos`;
const approveUrl = `${loansUrl}/aprovar/71`;
const rejectUrl = `${loansUrl}/reprovar/71`;
const sessionToken = 'session-token';

const pendingLoan = {
  id: 71,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: '',
  dataAprovacao: null,
  status: 'Pendente',
  emprestimoProdutos: [],
  solicitanteId: 501,
  solicitante: {
    id: 501,
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
  },
  aprovadorId: null,
  aprovador: null,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoansRequest />
    </MemoryRouter>
  );

describe('LoansRequest: erros de consulta e mutação', () => {
  beforeEach(() => {
    toastMock.mockReset();
    Cookie.set('doorKey', sessionToken);
    Cookie.set('rankID', '12');
    server.use(
      http.get(loansUrl, () => HttpResponse.json([pendingLoan]))
    );
  });

  afterEach(() => {
    Cookie.remove('doorKey');
    Cookie.remove('rankID');
  });

  it('mantém a falha de carga persistente e recupera a lista pelo mesmo controle', async () => {
    let attempts = 0;
    server.use(
      http.get(loansUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { detail: 'LOANS_LOAD_SECRET', traceId: 'loans-load-1' },
              { status: 500 }
            )
          : HttpResponse.json([pendingLoan]);
      })
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os empréstimos');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.server.message);
    expect(feedback).toHaveTextContent(ERROR_CATALOG.server.suggestedAction);
    expect(feedback).toHaveTextContent('Código de referência: loans-load-1');
    expect(feedback).not.toHaveTextContent('LOANS_LOAD_SECRET');
    expect(screen.queryByText('Nenhuma solicitação de empréstimo pendente.')).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it.each([
    ['aprovação', approveUrl, 'Aprovar Ana Silva', 'aprovar o empréstimo'],
    ['rejeição', rejectUrl, 'Recusar Ana Silva', 'rejeitar o empréstimo'],
  ] as const)('preserva o item e reabilita o controle após falha de %s', async (_action, url, buttonName, operation) => {
    let resolveRequest!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    server.use(
      http.patch(url, () => request)
    );

    renderPage();

    const button = await screen.findByRole('button', { name: buttonName });
    button.click();
    await waitFor(() => expect(button).toBeDisabled());

    resolveRequest(
      HttpResponse.json(
        { detail: 'LOANS_MUTATION_SECRET', traceId: 'loans-mutation-500' },
        { status: 500 }
      )
    );

    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Solicitações de Empréstimos')).toBeInTheDocument();

    const notification = toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0];
    expect(notification).toEqual(
      expect.objectContaining({
        title: `Não foi possível ${operation}`,
        description: expect.stringContaining(ERROR_CATALOG.server.message),
      })
    );
    expect(notification.description).toContain(ERROR_CATALOG.server.suggestedAction);
    expect(notification.description).not.toContain('LOANS_MUTATION_SECRET');
  });

  it('mantém a sessão e o item quando rejeitar retorna 403', async () => {
    server.use(
      http.patch(rejectUrl, () =>
        HttpResponse.json(
          { detail: 'LOANS_FORBIDDEN_SECRET' },
          { status: 403 }
        )
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: 'Recusar Ana Silva' });
    button.click();

    await waitFor(() => expect(button).toBeEnabled());
    expect(Cookie.get('doorKey')).toBe(sessionToken);
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0]).toEqual(
      expect.objectContaining({
        title: 'Não foi possível rejeitar o empréstimo',
        description: expect.stringContaining(ERROR_CATALOG.authorization.message),
      })
    );
  });

  it('orienta atualização no conflito e conclui a aprovação após recuperação', async () => {
    let attempts = 0;
    server.use(
      http.patch(approveUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { detail: 'LOANS_CONFLICT_SECRET' },
              { status: 409 }
            )
          : HttpResponse.json({ ok: true });
      }),
      http.get(loansUrl, () =>
        attempts < 2 ? HttpResponse.json([pendingLoan]) : HttpResponse.json([])
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: 'Aprovar Ana Silva' });
    button.click();

    await waitFor(() => expect(button).toBeEnabled());
    const conflictNotification = toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0];
    expect(conflictNotification).toEqual(
      expect.objectContaining({
        title: 'Não foi possível aprovar o empréstimo',
        description: expect.stringContaining(ERROR_CATALOG.conflict.message),
      })
    );
    expect(conflictNotification.description).toContain(
      ERROR_CATALOG.conflict.suggestedAction
    );

    button.click();
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Solicitação aceita' })
    ));
    await waitFor(() =>
      expect(screen.getByText('Nenhuma solicitação de empréstimo pendente.')).toBeInTheDocument()
    );
    expect(attempts).toBe(2);
  });
});
