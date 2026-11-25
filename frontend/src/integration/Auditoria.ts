import { api } from '../services/BaseApi';

import { OPERATION_IDS } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

export interface HistoricoClassificacaoAuditoria {
  numeroRevisao: number;
  suspeitaAnterior: boolean;
  suspeitaResultante: boolean;
  justificativa: string;
  criadaEmUtc: string;
  autorUsuarioId?: number;
  origem: string;
}

export interface LogAuditoria {
  id: number;
  codigoEvento: string;
  acao: string;
  recurso: string;
  dataHoraUtc: string;
  origem: string;
  resultado: string;
  suspeita: boolean;
  categoriaDeteccao: string;
  codigoRegraDeteccao?: string | null;
  versaoRegraDeteccao?: number | null;
  quantidadeObservadaDeteccao?: number | null;
  revisaoClassificacao: number;
  historicoClassificacao: HistoricoClassificacaoAuditoria[];
}

export interface ResultadoPaginadoAuditoria {
  itens: LogAuditoria[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
}

export interface FiltroAuditoria {
  dataInicio?: string;
  dataFim?: string;
  usuarioId?: number;
  tipoAcao?: string;
  nivelRisco?: string;
  apenasSuspeitas?: boolean;
  recurso?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface SolicitacaoReclassificacaoAuditoria {
  revisaoEsperada: number;
  justificativa: string;
}

export interface RelatorioAuditoria {
  totalLogs: number;
  logsSuspeitos: number;
  logsCriticos: number;
  logsPorTipo: { [key: string]: number };
  logsPorDia: { [key: string]: number };
  ultimosLogsSuspeitos: LogAuditoria[];
}

const criarParametrosFiltro = (
  filtro: FiltroAuditoria,
  incluirPaginacao = false
): URLSearchParams => {
  const params = new URLSearchParams();
  if (filtro.dataInicio) params.append('dataInicio', filtro.dataInicio);
  if (filtro.dataFim) params.append('dataFim', filtro.dataFim);
  if (filtro.usuarioId !== undefined)
    params.append('usuarioId', filtro.usuarioId.toString());
  if (filtro.tipoAcao) params.append('tipoAcao', filtro.tipoAcao);
  if (filtro.nivelRisco) params.append('nivelRisco', filtro.nivelRisco);
  if (filtro.apenasSuspeitas)
    params.append('apenasSuspeitas', 'true');
  if (filtro.recurso) params.append('recurso', filtro.recurso);
  if (incluirPaginacao && filtro.pagina !== undefined)
    params.append('pagina', filtro.pagina.toString());
  if (incluirPaginacao && filtro.tamanhoPagina !== undefined)
    params.append('tamanhoPagina', filtro.tamanhoPagina.toString());
  return params;
};

export const obterLogsAuditoria = async (
  filtro: FiltroAuditoria = {}
): Promise<ResultadoPaginadoAuditoria> => {
  try {
    const params = criarParametrosFiltro(filtro, true);

    const response = await api({
      method: 'GET',
      url: `/Auditoria/logs?${params.toString()}`,
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.auditLogs);
  }
};

export const gerarRelatorioAuditoria = async (
  filtro: FiltroAuditoria = {}
): Promise<RelatorioAuditoria> => {
  try {
    const params = criarParametrosFiltro(filtro);

    const response = await api({
      method: 'GET',
      url: `/Auditoria/relatorio?${params.toString()}`,
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.auditReport);
  }
};

export const exportarAuditoria = async (
  filtro: FiltroAuditoria = {}
): Promise<Blob> => {
  try {
    const params = criarParametrosFiltro(filtro);
    const response = await api({
      method: 'GET',
      url: `/Auditoria/exportar?${params.toString()}`,
      responseType: 'blob',
    });

    return response.data as Blob;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.auditExport);
  }
};

export const marcarLogComoSuspeito = async (
  logId: number,
  solicitacao: SolicitacaoReclassificacaoAuditoria
): Promise<void> => {
  try {
    await api({
      method: 'PATCH',
      url: `/Auditoria/marcar-suspeito/${logId}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: solicitacao,
    });
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.markAuditLogSuspicious);
  }
};

export const marcarLogComoNaoSuspeito = async (
  logId: number,
  solicitacao: SolicitacaoReclassificacaoAuditoria
): Promise<void> => {
  try {
    await api({
      method: 'PATCH',
      url: `/Auditoria/marcar-nao-suspeito/${logId}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: solicitacao,
    });
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.markAuditLogNotSuspicious);
  }
};

export const verificarAtividadeSuspeita = async (
  usuarioId: number
): Promise<{ suspeita: boolean }> => {
  try {

    const response = await api({
      method: 'GET',
      url: `/Auditoria/verificar-atividade-suspeita?usuarioId=${usuarioId}`,
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.checkSuspiciousActivity);
  }
};
