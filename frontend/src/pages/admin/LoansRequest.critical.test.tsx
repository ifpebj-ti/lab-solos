import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';

import LoansRequest from './LoansRequest';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';
const loansUrl = `${API_ORIGIN}/Emprestimos`;
const approveUrl = `${loansUrl}/aprovar/71`;
const rejectUrl = `${loansUrl}/reprovar/71`;

const pendingLoan = {
  id: 71,
  dataRealizacao: '2026-09-01T10:00:00',
  dataPrevistaDevolucao: '2026-09-08T10:00:00',
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [],
  solicitante: {
    id: 501,
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: null,
    dataIngresso: '2026-09-01',
    status: 'Habilitado',
    nivelUsuario: 'Mentorado',
    tipoUsuario: 'Academico',
    responsavel: null,
  },
  aprovador: null,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/loans-request']}>
      <LoansRequest />
    </MemoryRouter>
  );

const pendingLoansResponse = () => HttpResponse.json([pendingLoan]);
const emptyLoansResponse = () => HttpResponse.json([]);
const lastToast = () => toastMock.mock.calls[toastMock.mock.calls.length - 1]?.[0];

describe('LoansRequest: decisoes criticas', () => {
  beforeEach(() => {
    toastMock.mockReset();
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', '12');
    server.use(http.get(loansUrl, pendingLoansResponse));
  });

  it.each([
    ['aprova', approveUrl, 'Aprovar Ana Silva', 'Solicitação aceita'],
    ['rejeita', rejectUrl, 'Recusar Ana Silva', 'Solicitação rejeitada'],
  ] as const)('atualiza a lista quando %s a solicitacao', async (_action, url, buttonName, toastTitle) => {
    let mutationCount = 0;
    server.use(
      http.patch(url, () => {
        mutationCount += 1;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(loansUrl, () =>
        mutationCount === 0 ? pendingLoansResponse() : emptyLoansResponse()
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: buttonName });

    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByText('Nenhuma solicitação de empréstimo pendente.')).toBeInTheDocument()
    );
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(lastToast()).toEqual(
      expect.objectContaining({ title: toastTitle })
    );
    expect(mutationCount).toBe(1);
  });

  it('mantem a pendencia quando o estoque e insuficiente', async () => {
    server.use(
      http.patch(approveUrl, () =>
        HttpResponse.json({ detail: 'STOCK_SECRET' }, { status: 400 })
      )
    );

    renderPage();
    const button = await screen.findByRole('button', { name: 'Aprovar Ana Silva' });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma solicitação de empréstimo pendente.')).not.toBeInTheDocument();
    expect(lastToast()).toEqual(
      expect.objectContaining({ title: 'Não foi possível aprovar o empréstimo' })
    );
    expect(lastToast()).not.toEqual(
      expect.objectContaining({ title: 'Solicitação aceita' })
    );
  });

  it('nao envia uma segunda decisao enquanto a primeira esta pendente', async () => {
    let resolveMutation!: (response: Response) => void;
    const mutation = new Promise<Response>((resolve) => {
      resolveMutation = resolve;
    });
    let mutationCount = 0;
    server.use(
      http.patch(approveUrl, () => {
        mutationCount += 1;
        return mutation;
      })
    );

    renderPage();
    const button = await screen.findByRole('button', { name: 'Aprovar Ana Silva' });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    expect(mutationCount).toBe(1);

    resolveMutation(new HttpResponse(null, { status: 400 }));
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });
});
