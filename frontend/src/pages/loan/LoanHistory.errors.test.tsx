import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';

import LoanHistory from './LoanHistory';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';
const loanUrl = `${API_ORIGIN}/Emprestimos/99`;
const approveUrl = `${API_ORIGIN}/Emprestimos/aprovar/99`;
const rejectUrl = `${API_ORIGIN}/Emprestimos/reprovar/99`;
const returnUrl = `${API_ORIGIN}/Emprestimos/devolver/99`;
const sessionToken = 'session-token';

const loan = {
  id: 99,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: '81999999999',
    nivelUsuario: 'Mentorado',
  },
  aprovador: null,
  produtos: [
    {
      emprestimoId: 99,
      quantidade: 2,
      produto: {
        id: 201,
        nomeProduto: 'Béquer',
        tipoProduto: 'Vidraria',
        quantidade: 2,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-201' },
      },
    },
  ],
};

const pendingLoan = { ...loan, status: 'Pendente', dataDevolucao: null };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/history/loan', state: { id: 99 } }]}>
      <LoanHistory />
    </MemoryRouter>
  );

describe('LoanHistory: erros de consulta e mutação', () => {
  beforeEach(() => {
    toastMock.mockReset();
    Cookie.set('doorKey', sessionToken);
    Cookie.set('rankID', '12');
    server.use(http.get(loanUrl, () => HttpResponse.json(loan)));
  });

  afterEach(() => {
    Cookie.remove('doorKey');
    Cookie.remove('rankID');
  });

  it('mantém a falha da consulta persistente e recupera o empréstimo', async () => {
    let attempts = 0;
    server.use(
      http.get(loanUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { detail: 'LOAN_LOAD_SECRET', traceId: 'loan-load-1' },
              { status: 500 }
            )
          : HttpResponse.json(loan);
      })
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar o empréstimo');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.server.message);
    expect(feedback).toHaveTextContent('Código de referência: loan-load-1');
    expect(feedback).not.toHaveTextContent('LOAN_LOAD_SECRET');
    expect(screen.queryByText('Nenhum dado disponível para exibição.')).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it.each([
    ['aprovação', approveUrl, 'Aceitar', 'aprovar o empréstimo'],
    ['rejeição', rejectUrl, 'Rejeitar', 'rejeitar o empréstimo'],
  ] as const)('preserva o status e reabilita o controle após falha de %s', async (_action, url, buttonName, operation) => {
    server.use(
      http.get(loanUrl, () => HttpResponse.json(pendingLoan)),
      http.patch(url, () =>
        HttpResponse.json(
          { detail: 'LOAN_MUTATION_SECRET', traceId: 'loan-mutation-500' },
          { status: 500 }
        )
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: buttonName });
    button.click();

    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByRole('heading', { name: /Histórico de Empréstimo - Pendente/ })).toBeInTheDocument();
    const notification = toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0];
    expect(notification).toEqual(
      expect.objectContaining({
        title: `Não foi possível ${operation}`,
        description: expect.stringContaining(ERROR_CATALOG.server.message),
      })
    );
    expect(notification.description).toContain(ERROR_CATALOG.server.suggestedAction);
    expect(notification.description).not.toContain('LOAN_MUTATION_SECRET');
  });

  it('mantém a sessão e o empréstimo quando devolver retorna 403', async () => {
    server.use(
      http.patch(returnUrl, () =>
        HttpResponse.json(
          { detail: 'LOAN_FORBIDDEN_SECRET' },
          { status: 403 }
        )
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: 'Registrar Devolução' });
    button.click();

    await waitFor(() => expect(button).toBeEnabled());
    expect(Cookie.get('doorKey')).toBe(sessionToken);
    expect(screen.getByRole('heading', { name: /Histórico de Empréstimo - Aprovado/ })).toBeInTheDocument();
    expect(toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0]).toEqual(
      expect.objectContaining({
        title: 'Não foi possível registrar a devolução',
        description: expect.stringContaining(ERROR_CATALOG.authorization.message),
      })
    );
  });

  it('orienta atualização no conflito e recupera a devolução com sucesso', async () => {
    let attempts = 0;
    server.use(
      http.patch(returnUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { detail: 'LOAN_CONFLICT_SECRET' },
              { status: 409 }
            )
          : HttpResponse.json({ ok: true });
      }),
      http.get(loanUrl, () =>
        attempts < 2
          ? HttpResponse.json(loan)
          : HttpResponse.json({ ...loan, dataDevolucao: '2026-09-07T10:00:00' })
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: 'Registrar Devolução' });
    button.click();

    await waitFor(() => expect(button).toBeEnabled());
    const conflictNotification = toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0];
    expect(conflictNotification).toEqual(
      expect.objectContaining({
        title: 'Não foi possível registrar a devolução',
        description: expect.stringContaining(ERROR_CATALOG.conflict.message),
      })
    );
    expect(conflictNotification.description).toContain(
      ERROR_CATALOG.conflict.suggestedAction
    );

    button.click();
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Devolução registrada' })
      )
    );
    expect(await screen.findByText('Empréstimo Devolvido')).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
