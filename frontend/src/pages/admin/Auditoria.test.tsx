import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { establishTestSession } from '@/test/session';
import { server } from '@/test/msw/server';

import AuditoriaPage from './Auditoria';

const API_ORIGIN = 'http://localhost:8080/api';
const requests: { operation: string; url: URL }[] = [];
const mocks = vi.hoisted(() => ({ saveAs: vi.fn() }));

vi.mock('file-saver', () => ({ saveAs: mocks.saveAs }));

const log = {
  id: 42,
  codigoEvento: 'FalhaOperacao',
  acao: 'Login',
  recurso: 'Produto',
  dataHoraUtc: '2026-11-20T12:30:00Z',
  origem: 'Aplicação',
  resultado: 'Negado',
  suspeita: true,
  categoriaDeteccao: 'Conta',
  codigoRegraDeteccao: 'logins-repetidos',
  versaoRegraDeteccao: 3,
  quantidadeObservadaDeteccao: 8,
  revisaoClassificacao: 1,
  historicoClassificacao: [
    {
      numeroRevisao: 1,
      suspeitaAnterior: false,
      suspeitaResultante: true,
      justificativa: 'Revisão confirmada pelo perfil autorizado.',
      criadaEmUtc: '2026-11-20T13:00:00Z',
      autorUsuarioId: 11,
      origem: 'Revisão manual',
    },
  ],
  enderecoIP: '198.51.100.24',
  emailUsuario: 'nao-exibir@example.test',
  dadosRequisicao: 'CONTEXTO_BRUTO_NAO_EXIBIR',
};

const report = {
  totalLogs: 1,
  logsSuspeitos: 1,
  logsCriticos: 0,
  logsPorTipo: { Login: 1 },
  logsPorDia: { '2026-11-20': 1 },
  ultimosLogsSuspeitos: [log],
};

const setAuditHandlers = (options?: { empty?: boolean; unauthorized?: boolean }) => {
  requests.length = 0;
  server.use(
    http.get(`${API_ORIGIN}/Auditoria/logs`, ({ request }) => {
      requests.push({ operation: 'logs', url: new URL(request.url) });
      if (options?.unauthorized) {
        return HttpResponse.json({ detail: 'SEGREDO_REMOTO' }, { status: 403 });
      }
      if (options?.empty) {
        return HttpResponse.json({
          itens: [],
          pagina: 1,
          tamanhoPagina: 25,
          totalItens: 0,
          totalPaginas: 0,
        });
      }
      const pagina = Number(new URL(request.url).searchParams.get('pagina') ?? 1);
      return HttpResponse.json({
        itens: [log],
        pagina,
        tamanhoPagina: 25,
        totalItens: 26,
        totalPaginas: 2,
      });
    }),
    http.get(`${API_ORIGIN}/Auditoria/relatorio`, ({ request }) => {
      requests.push({ operation: 'relatorio', url: new URL(request.url) });
      if (options?.unauthorized) {
        return HttpResponse.json({ detail: 'SEGREDO_REMOTO' }, { status: 403 });
      }
      return HttpResponse.json(options?.empty ? { ...report, totalLogs: 0, logsSuspeitos: 0 } : report);
    }),
    http.get(`${API_ORIGIN}/Auditoria/exportar`, ({ request }) => {
      requests.push({ operation: 'exportar', url: new URL(request.url) });
      return new HttpResponse('evento,resultado\nLogin,Negado', {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      });
    })
  );
};

describe('Auditoria administrativa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    establishTestSession('11', 'Administrador');
  });

  it('preserva os filtros na consulta, na paginação e na exportação CSV', async () => {
    setAuditHandlers();
    render(<AuditoriaPage />);

    await screen.findByText('FalhaOperacao');
    fireEvent.change(screen.getByLabelText('Data inicial'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText('Recurso'), {
      target: { value: 'Produto' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      const logRequests = requests.filter((request) => request.operation === 'logs');
      const latestLogs = logRequests[logRequests.length - 1]?.url;
      expect(latestLogs?.searchParams.get('dataInicio')).toBe('2026-11-01');
      expect(latestLogs?.searchParams.get('recurso')).toBe('Produto');
      expect(latestLogs?.searchParams.get('pagina')).toBe('1');
      const reportRequests = requests.filter((request) => request.operation === 'relatorio');
      const latestReport = reportRequests[reportRequests.length - 1]?.url;
      expect(latestReport?.searchParams.get('dataInicio')).toBe('2026-11-01');
      expect(latestReport?.searchParams.get('recurso')).toBe('Produto');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() => {
      const logRequests = requests.filter((request) => request.operation === 'logs');
      const latestLogs = logRequests[logRequests.length - 1]?.url;
      expect(latestLogs?.searchParams.get('pagina')).toBe('2');
      expect(latestLogs?.searchParams.get('dataInicio')).toBe('2026-11-01');
      expect(latestLogs?.searchParams.get('recurso')).toBe('Produto');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() => {
      expect(mocks.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'auditoria.csv');
    });
    const exportUrl = requests.find((request) => request.operation === 'exportar')?.url;
    expect(exportUrl?.searchParams.get('dataInicio')).toBe('2026-11-01');
    expect(exportUrl?.searchParams.get('recurso')).toBe('Produto');
    expect(exportUrl?.searchParams.has('pagina')).toBe(false);
  });

  it('apresenta o histórico e a regra sem mostrar IP, e-mail ou contexto bruto', async () => {
    setAuditHandlers();
    render(<AuditoriaPage />);

    fireEvent.click(await screen.findByText('Histórico e regra'));

    expect(await screen.findByText(/Regra: logins-repetidos/)).toBeInTheDocument();
    expect(screen.getByText('Versão 3')).toBeInTheDocument();
    expect(screen.getByText('Revisão 1')).toBeInTheDocument();
    expect(screen.getByText('Autor: ID 11')).toBeInTheDocument();
    expect(screen.queryByText('198.51.100.24')).not.toBeInTheDocument();
    expect(screen.queryByText('nao-exibir@example.test')).not.toBeInTheDocument();
    expect(screen.queryByText('CONTEXTO_BRUTO_NAO_EXIBIR')).not.toBeInTheDocument();
  });

  it('indica a exportação em andamento e impede uma segunda solicitação', async () => {
    setAuditHandlers();
    let concluirExportacao: (() => void) | undefined;
    server.use(
      http.get(`${API_ORIGIN}/Auditoria/exportar`, async () => {
        await new Promise<void>((resolve) => {
          concluirExportacao = resolve;
        });
        return new HttpResponse('evento,resultado\nLogin,Negado', {
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        });
      })
    );
    render(<AuditoriaPage />);
    await screen.findByText('FalhaOperacao');

    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    const exportingButton = await screen.findByRole('button', { name: 'Exportando...' });
    expect(exportingButton).toBeDisabled();
    fireEvent.click(exportingButton);

    concluirExportacao?.();
    await screen.findByRole('button', { name: 'Exportar CSV' });
    expect(mocks.saveAs).toHaveBeenCalledTimes(1);
  });

  it('confirma a revisão com o número atual e uma justificativa', async () => {
    setAuditHandlers();
    let body: unknown;
    server.use(
      http.patch(`${API_ORIGIN}/Auditoria/marcar-nao-suspeito/42`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    render(<AuditoriaPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Remover suspeita' }));
    fireEvent.change(screen.getByLabelText('Justificativa da revisão'), {
      target: { value: 'Revisão humana concluída.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar revisão' }));

    await waitFor(() => {
      expect(body).toEqual({
        revisaoEsperada: 1,
        justificativa: 'Revisão humana concluída.',
      });
    });
  });

  it('distingue uma lista vazia de falha de autorização', async () => {
    setAuditHandlers({ empty: true });
    const { unmount } = render(<AuditoriaPage />);
    expect(await screen.findByText('Nenhum evento de auditoria encontrado para os filtros selecionados.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    setAuditHandlers({ unauthorized: true });
    render(<AuditoriaPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para esta ação.');
    expect(screen.queryByText('Nenhum evento de auditoria encontrado para os filtros selecionados.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar CSV' })).not.toBeInTheDocument();
    expect(screen.queryByText('SEGREDO_REMOTO')).not.toBeInTheDocument();
  });
});
