import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

export interface LogAuditoria {
  id: number;
  dataHora: string;
  acao: string;
  recurso: string;
  detalhes?: string;
  enderecoIP: string;
  userAgent?: string;
  tipoAcao: string;
  nivelRisco: string;
  suspeita: boolean;
  motivoSuspeita?: string;
  usuarioId?: number;
  nomeUsuario?: string;
  emailUsuario?: string;
  dadosRequisicao?: string;
  dadosResposta?: string;
  tempoSessao?: string;
  tentativasAcesso?: number;
  origem?: string;
}

export interface FiltroAuditoria {
  dataInicio?: string;
  dataFim?: string;
  usuarioId?: number;
  tipoAcao?: string;
  nivelRisco?: string;
  apenasSuspeitas?: boolean;
  enderecoIP?: string;
  recurso?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface RelatorioAuditoria {
  totalLogs: number;
  logsSuspeitos: number;
  logsCriticos: number;
  logsPorTipo: { [key: string]: number };
  logsPorUsuario: { [key: string]: number };
  logsPorIP: { [key: string]: number };
  logsPorDia: { [key: string]: number };
  ultimosLogsSuspeitos: LogAuditoria[];
  ipsSuspeitos: string[];
  usuariosComMaisAcessos: string[];
}

export const obterLogsAuditoria = async (
  filtro: FiltroAuditoria = {}
): Promise<LogAuditoria[]> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const params = new URLSearchParams();
    if (filtro.dataInicio) params.append('dataInicio', filtro.dataInicio);
    if (filtro.dataFim) params.append('dataFim', filtro.dataFim);
    if (filtro.usuarioId)
      params.append('usuarioId', filtro.usuarioId.toString());
    if (filtro.tipoAcao) params.append('tipoAcao', filtro.tipoAcao);
    if (filtro.nivelRisco) params.append('nivelRisco', filtro.nivelRisco);
    if (filtro.apenasSuspeitas) params.append('apenasSuspeitas', 'true');
    if (filtro.enderecoIP) params.append('enderecoIP', filtro.enderecoIP);
    if (filtro.recurso) params.append('recurso', filtro.recurso);
    if (filtro.pagina) params.append('pagina', filtro.pagina.toString());
    if (filtro.tamanhoPagina)
      params.append('tamanhoPagina', filtro.tamanhoPagina.toString());

    const response = await api({
      method: 'GET',
      url: `/Auditoria/logs?${params.toString()}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao buscar logs de auditoria:', error);
    }
    throw error;
  }
};

export const gerarRelatorioAuditoria = async (
  dataInicio?: string,
  dataFim?: string
): Promise<RelatorioAuditoria> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const params = new URLSearchParams();
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);

    const response = await api({
      method: 'GET',
      url: `/Auditoria/relatorio?${params.toString()}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao gerar relatório de auditoria:', error);
    }
    throw error;
  }
};

export const marcarLogComoSuspeito = async (
  logId: number,
  motivo: string
): Promise<void> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    await api({
      method: 'PATCH',
      url: `/Auditoria/marcar-suspeito/${logId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(motivo),
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao marcar log como suspeito:', error);
    }
    throw error;
  }
};

export const marcarLogComoNaoSuspeito = async (
  logId: number
): Promise<void> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    await api({
      method: 'PATCH',
      url: `/Auditoria/marcar-nao-suspeito/${logId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao marcar log como não suspeito:', error);
    }
    throw error;
  }
};

export const verificarAtividadeSuspeita = async (
  usuarioId: number
): Promise<{ suspeita: boolean }> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'GET',
      url: `/Auditoria/verificar-atividade-suspeita?usuarioId=${usuarioId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao verificar atividade suspeita:', error);
    }
    throw error;
  }
};
