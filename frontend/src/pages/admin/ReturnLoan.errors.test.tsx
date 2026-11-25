import { http, HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';
import { establishTestSession } from '@/test/session';
import { readSession } from '@/auth/session';

import ReturnLoan from './ReturnLoan';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';
const loanUrl = `${API_ORIGIN}/Emprestimos/99`;
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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/return', state: { id: 99 } }]}>
      <ReturnLoan />
    </MemoryRouter>
  );

describe('ReturnLoan: erros de consulta e devolução', () => {
  beforeEach(() => {
    toastMock.mockReset();
    establishTestSession('12', 'Administrador');
    server.use(http.get(loanUrl, () => HttpResponse.json(loan)));
  });

  afterEach(() => {
  });

  it('mantém a falha de carga persistente e recupera o empréstimo', async () => {
    let attempts = 0;
    server.use(
      http.get(loanUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { detail: 'RETURN_LOAD_SECRET', traceId: 'return-load-1' },
              { status: 500 }
            )
          : HttpResponse.json(loan);
      })
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar o empréstimo');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.server.message);
    expect(feedback).toHaveTextContent('Código de referência: return-load-1');
    expect(feedback).not.toHaveTextContent('RETURN_LOAD_SECRET');
    expect(screen.queryByText('Devolução de Empréstimo')).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    expect(await screen.findByText('Devolução de Empréstimo')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('preserva o status, não encerra a sessão e reabilita o controle em 403', async () => {
    server.use(
      http.patch(returnUrl, () =>
        HttpResponse.json(
          { detail: 'RETURN_FORBIDDEN_SECRET' },
          { status: 403 }
        )
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: 'Registrar Devolução' });
    button.click();

    await waitFor(() => expect(button).toBeEnabled());
    expect(readSession()?.userId).toBe('12');
    expect(screen.getByText('Registrar Devolução')).toBeInTheDocument();
    expect(toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0]).toEqual(
      expect.objectContaining({
        title: 'Não foi possível registrar a devolução',
        description: expect.stringContaining(ERROR_CATALOG.authorization.message),
      })
    );
    expect(toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0].description).not.toContain(
      'RETURN_FORBIDDEN_SECRET'
    );
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
    expect(screen.getByText('Data prevista para devolução')).toBeInTheDocument();
    expect(screen.getByText('Data efetiva da devolução')).toBeInTheDocument();
  });

  it('reconsulta e bloqueia o reenvio quando outra pessoa conclui a devolução', async () => {
    let attempts = 0;
    let reads = 0;
    server.use(
      http.patch(returnUrl, () => {
        attempts += 1;
        return HttpResponse.json(
          { code: 'loan_return_already_recorded' },
          { status: 409 }
        );
      }),
      http.get(loanUrl, () => {
        reads += 1;
        return HttpResponse.json(
          reads === 1 ? loan : { ...loan, dataDevolucao: '2026-09-07T10:00:00' }
        );
      })
    );

    renderPage();
    await screen.findByRole('button', { name: 'Registrar Devolução' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Devolução' }));

    expect(await screen.findByText('Devolvido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar Devolução' })).not.toBeInTheDocument();
    const conflictNotification = toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0];
    expect(conflictNotification).toEqual(
      expect.objectContaining({
        title: 'Não foi possível registrar a devolução',
        description: expect.stringContaining(ERROR_CATALOG.conflict.message),
      })
    );
    expect(attempts).toBe(1);
    expect(reads).toBe(2);
  });

  it('reconsulta antes de reabilitar a devolução após resposta de rede incerta', async () => {
    let attempts = 0;
    let reads = 0;
    server.use(
      http.patch(returnUrl, () => {
        attempts += 1;
        return HttpResponse.error();
      }),
      http.get(loanUrl, () => {
        reads += 1;
        return HttpResponse.json(
          reads === 1 ? loan : { ...loan, dataDevolucao: '2026-09-07T10:00:00' }
        );
      })
    );

    renderPage();
    await screen.findByRole('button', { name: 'Registrar Devolução' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Devolução' }));

    expect(await screen.findByText('Devolvido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar Devolução' })).not.toBeInTheDocument();
    expect(attempts).toBe(1);
    expect(reads).toBe(2);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Não foi possível registrar a devolução',
        description: expect.stringContaining(ERROR_CATALOG.network.message),
      })
    );
  });
});
