import Cookie from 'js-cookie';
import { api } from '../services/BaseApi';

export interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  tipoTexto: string;
  lida: boolean;
  dataCriacao: string;
  dataLeitura?: string;
  linkAcao?: string;
  referenciaId?: number;
  tipoReferencia?: string;
}

export interface CreateNotificacao {
  titulo: string;
  mensagem: string;
  tipo: string;
  usuarioId?: number;
  linkAcao?: string;
  referenciaId?: number;
  tipoReferencia?: string;
}

export const getMinhasNotificacoes = async (
  apenasNaoLidas: boolean = false
): Promise<Notificacao[]> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'GET',
      url: `Notificacoes/minhas?apenasNaoLidas=${apenasNaoLidas}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao buscar notificações:', error);
    }
    throw error;
  }
};

export const getCountNotificacoesNaoLidas = async (): Promise<{
  count: number;
}> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'GET',
      url: 'Notificacoes/count-nao-lidas',
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao contar notificações não lidas:', error);
    }
    throw error;
  }
};

export const marcarNotificacaoComoLida = async (
  notificacaoId: number
): Promise<void> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    await api({
      method: 'PATCH',
      url: `Notificacoes/${notificacaoId}/marcar-lida`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao marcar notificação como lida:', error);
    }
    throw error;
  }
};

export const marcarVariasNotificacoesComoLidas = async (
  notificacaoIds: number[]
): Promise<void> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    await api({
      method: 'PATCH',
      url: 'Notificacoes/marcar-lidas',
      headers: {
        Authorization: `Bearer ${doorKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        notificacaoIds,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao marcar notificações como lidas:', error);
    }
    throw error;
  }
};

export const criarNotificacao = async (
  notificacao: CreateNotificacao
): Promise<Notificacao> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'POST',
      url: 'Notificacoes',
      headers: {
        Authorization: `Bearer ${doorKey}`,
        'Content-Type': 'application/json',
      },
      data: notificacao,
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao criar notificação:', error);
    }
    throw error;
  }
};

export const gerarNotificacoesAutomaticas = async (): Promise<void> => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    await api({
      method: 'POST',
      url: 'Notificacoes/gerar-automaticas',
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao gerar notificações automáticas:', error);
    }
    throw error;
  }
};
