import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';

import ReturnLoan from './ReturnLoan';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';
const loanUrl = `${API_ORIGIN}/Emprestimos/99`;
const returnUrl = `${API_ORIGIN}/Emprestimos/devolver/99`;
const sessionToken = 'session-token';

const loan = {
  id: 99,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: '',
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: '81999999999',
    responsavel: null,
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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/return', state: { id: 99 } }]}>
      <ReturnLoan />
    </MemoryRouter>
  );

describe('ReturnLoan: erros de consulta e devolução', () => {
  beforeEach(() => {
    toastMock.mockReset();
    Cookie.set('doorKey', sessionToken);
    server.use(http.get(loanUrl, () => HttpResponse.json(loan)));
  });

  afterEach(() => {
    Cookie.remove('doorKey');
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
    expect(Cookie.get('doorKey')).toBe(sessionToken);
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

  it('orienta atualização no conflito e registra a devolução após recuperação', async () => {
    let attempts = 0;
    server.use(
      http.patch(returnUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { detail: 'RETURN_CONFLICT_SECRET' },
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
    expect(await screen.findByText('Devolvido')).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
