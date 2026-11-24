import { http, HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';
import { establishTestSession } from '@/test/session';
import { readSession } from '@/auth/session';

import LoanHistory from './LoanHistory';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';
const loanUrl = `${API_ORIGIN}/Emprestimos/99`;
const approveUrl = `${API_ORIGIN}/Emprestimos/aprovar/99`;
const rejectUrl = `${API_ORIGIN}/Emprestimos/reprovar/99`;
const returnUrl = `${API_ORIGIN}/Emprestimos/devolver/99`;

const loan = {
  id: 99,
  dataRealizacao: '2026-09-01T10:00:00',
  dataPrevistaDevolucao: '2026-09-08T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    id: 501,
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: '81999999999',
    dataIngresso: '2026-09-01',
    status: 'Habilitado',
    nivelUsuario: 'Mentorado',
    tipoUsuario: 'Academico',
    responsavel: null,
  },
  aprovador: null,
  produtos: [
    {
      emprestimoId: 99,
      quantidade: 2,
      produto: {
        id: 201,
        catmat: 'CAT-201',
        nomeProduto: 'Béquer',
        tipoProduto: 'Vidraria',
        fornecedor: null,
        quantidade: 2,
        quantidadeMinima: 1,
        unidadeMedida: 'Unidade',
        localizacaoProduto: null,
        dataFabricacao: null,
        dataValidade: null,
        ultimaModificacao: '2026-09-01T10:00:00Z',
        status: 'Disponivel',
        lote: {
          codigoLote: 'L-201',
          fornecedor: null,
          dataFabricacao: null,
          dataValidade: null,
          dataEntrada: null,
          produtos: [],
        },
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
    establishTestSession('12', 'Administrador');
    server.use(http.get(loanUrl, () => HttpResponse.json(loan)));
  });

  afterEach(() => {
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
    fireEvent.click(await screen.findByRole('button', { name: buttonName }));

    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: buttonName })).toBeEnabled()
    );
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeEnabled();
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

  it.each([
    ['Aceitar', approveUrl, 'Aprovado', 'Solicitação aceita'],
    ['Rejeitar', rejectUrl, 'Rejeitado', 'Solicitação rejeitada'],
  ] as const)('reconsulta o detalhe após %s e exibe a decisão gravada', async (buttonName, url, status, title) => {
    let decisionSaved = false;
    server.use(
      http.get(loanUrl, () => HttpResponse.json(decisionSaved ? { ...loan, status } : pendingLoan)),
      http.patch(url, () => {
        decisionSaved = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: buttonName }));

    expect(await screen.findByRole('heading', { name: `Histórico de Empréstimo - ${status}` })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title }));
  });

  it('preserva outro detalhe aberto antes de a decisão terminar', async () => {
    let finishDecision: () => void = () => undefined;
    const decisionInProgress = new Promise<void>((resolve) => {
      finishDecision = resolve;
    });
    let originalReads = 0;
    const otherLoan = {
      ...pendingLoan,
      id: 100,
      solicitante: { ...loan.solicitante, nomeCompleto: 'Outra solicitante' },
      produtos: [],
    };
    server.use(
      http.get(loanUrl, () => {
        originalReads += 1;
        return HttpResponse.json(pendingLoan);
      }),
      http.get(`${API_ORIGIN}/Emprestimos/100`, () => HttpResponse.json(otherLoan)),
      http.patch(approveUrl, async () => {
        await decisionInProgress;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/admin/history/loan?id=99']}>
        <LoanHistory />
        <Link to='/admin/history/loan?id=100'>Outra solicitação</Link>
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar' }));
    fireEvent.click(screen.getByRole('link', { name: 'Outra solicitação' }));

    expect(await screen.findByText('Outra solicitante')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeDisabled();
    finishDecision();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Aceitar' })).toBeEnabled());
    expect(screen.getByText('Outra solicitante')).toBeInTheDocument();
    expect(originalReads).toBe(1);
  });

  it('exibe as datas prevista e efetiva de devolução em campos separados', async () => {
    server.use(
      http.get(loanUrl, () =>
        HttpResponse.json({
          ...loan,
          dataDevolucao: '2026-09-07T12:00:00',
        })
      )
    );

    renderPage();

    expect(await screen.findByText('08/09/2026')).toBeInTheDocument();
    expect(screen.getByText('07/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Devolução prevista')).toBeInTheDocument();
    expect(screen.getByText('Devolução efetiva')).toBeInTheDocument();
  });

  it('reconsulta e reflete a decisão concorrente após conflito', async () => {
    let reads = 0;
    let decisions = 0;
    server.use(
      http.get(loanUrl, () => {
        reads += 1;
        return HttpResponse.json(reads === 1 ? pendingLoan : loan);
      }),
      http.patch(approveUrl, () => {
        decisions += 1;
        return HttpResponse.json({ code: 'loan_decision_already_recorded' }, { status: 409 });
      })
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar' }));

    expect(await screen.findByRole('heading', { name: 'Histórico de Empréstimo - Aprovado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument();
    expect(reads).toBe(2);
    expect(decisions).toBe(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Não foi possível aprovar o empréstimo',
        description: expect.stringContaining(ERROR_CATALOG.conflict.message),
      })
    );
  });

  it('reconsulta antes de permitir reenvio após resposta de rede incerta', async () => {
    let reads = 0;
    let decisions = 0;
    server.use(
      http.get(loanUrl, () => {
        reads += 1;
        return HttpResponse.json(reads === 1 ? pendingLoan : loan);
      }),
      http.patch(approveUrl, () => {
        decisions += 1;
        return HttpResponse.error();
      })
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar' }));

    expect(await screen.findByRole('heading', { name: 'Histórico de Empréstimo - Aprovado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();
    expect(reads).toBe(2);
    expect(decisions).toBe(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Não foi possível aprovar o empréstimo',
        description: expect.stringContaining(ERROR_CATALOG.network.message),
      })
    );
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
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar Devolução' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Registrar Devolução' })).toBeEnabled()
    );
    expect(readSession()?.userId).toBe('12');
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
    await screen.findByRole('button', { name: 'Registrar Devolução' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Devolução' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Registrar Devolução' })).toBeEnabled()
    );
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

    fireEvent.click(screen.getByRole('button', { name: 'Registrar Devolução' }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Devolução registrada' })
      )
    );
    expect(await screen.findByText('Empréstimo Devolvido')).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
