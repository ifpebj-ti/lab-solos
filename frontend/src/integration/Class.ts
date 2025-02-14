import axios from 'axios';
import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

export const getLoansByDependentes = async () => {
  try {
    const doorKey = Cookie.get('doorKey');
    const rankID = Cookie.get('rankID');

    if (!doorKey || !rankID) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/${rankID}/dependentes/emprestimos`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar produtos', error);
    }
    throw error;
  }
};

export const getDependentes = async () => {
  try {
    const doorKey = Cookie.get('doorKey');
    const rankID = Cookie.get('rankID');

    if (!doorKey || !rankID) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/${rankID}/dependentes`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar produtos', error);
    }
    throw error;
  }
};

export const getDependentesID = async (rankID: string) => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/${rankID}/dependentes`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(`Usuário não possui dependentes.`);
      return []; // Retorna um array vazio se não houver dependentes
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar produtos', error);
    }
    throw error;
  }
};

export const getDependentesForApproval = async (rankID: string) => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/${rankID}/dependentes/aprovacao`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(`Usuário não possui dependentes para aprovação.`);
      return []; // Retorna um array vazio se não houver dependentes
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar dependentes para aprovação', error);
    }
    throw error;
  }
};

export const approveDependente = async (solicitanteId: string | number) => {
  try {
    const doorKey = Cookie.get('doorKey');
    const rankID = Cookie.get('rankID');

    if (!doorKey || !rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `/Usuarios/dependentes/${solicitanteId}/aprovar`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
      data: {
        aprovadorId: Number(rankID),
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao aprovar dependente:', error);
    }
    throw error;
  }
};

export const rejectDependente = async (solicitanteId: string | number) => {
  try {
    const doorKey = Cookie.get('doorKey');
    const rankID = Cookie.get('rankID');

    if (!doorKey || !rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `/Usuarios/dependentes/${solicitanteId}/rejeitar`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
      data: {
        aprovadorId: Number(rankID),
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao aprovar dependente:', error);
    }
    throw error;
  }
};
