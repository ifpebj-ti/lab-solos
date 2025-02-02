import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

interface ILoansByUserId {
  id: number | string;
}

export const getLoansByUserId = async ({ id }: ILoansByUserId) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Emprestimos/usuario/${id}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar emprestimos', error);
    }
    throw error;
  }
};

export const getLoansById = async ({ id }: ILoansByUserId) => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Emprestimos/${id}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar emprestimos', error);
    }
    throw error;
  }
};
