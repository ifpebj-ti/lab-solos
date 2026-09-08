import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

import { OPERATION_IDS } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

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
    throw reportAppError(error, OPERATION_IDS.loansByUser);
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
    throw reportAppError(error, OPERATION_IDS.loanById);
  }
};

interface IProduto {
  produtoId: number | string;
  quantidade: number | string;
}

interface ICreateLoan {
  diasParaDevolucao: number | string;
  solicitanteId: number | string;
  produtos: IProduto[];
}

export const createLoan = async (data: ICreateLoan) => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'POST',
      url: 'Emprestimos',
      data: data,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.createLoan);
  }
};

export const getAllLoans = async () => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Emprestimos`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.allLoans);
  }
};

export const approveLoan = async (EmprestimoId: string | number) => {
  try {
    const doorKey = Cookie.get('doorKey');
    const rankID = Cookie.get('rankID');

    if (!doorKey || !rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `/Emprestimos/aprovar/${EmprestimoId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
      data: {
        aprovadorId: Number(rankID),
      },
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.approveLoan);
  }
};

export const rejectLoan = async (EmprestimoId: string | number) => {
  try {
    const doorKey = Cookie.get('doorKey');
    const rankID = Cookie.get('rankID');

    if (!doorKey || !rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `/Emprestimos/reprovar/${EmprestimoId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
      data: {
        aprovadorId: Number(rankID),
      },
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.rejectLoan);
  }
};

export const returnLoan = async (EmprestimoId: string | number) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `/Emprestimos/devolver/${EmprestimoId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.returnLoan);
  }
};
