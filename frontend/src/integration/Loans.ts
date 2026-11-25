import { readSession } from '@/auth/session';
import { api } from '../services/BaseApi';
import { parseResourceId } from '@/contracts/identifier';

import { emprestimoSchema, emprestimosSchema } from '@/contracts/loan';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

interface ILoansByUserId {
  id: number | string;
}

export const getLoansByUserId = async ({ id }: ILoansByUserId) => {
  try {

    const response = await api({
      method: 'GET',
      url: `Emprestimos/usuario/${parseResourceId(id)}`,
    });
    emprestimosSchema.parse(response.data);
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.loansByUser);
  }
};

export const getLoansById = async ({ id }: ILoansByUserId) => {
  try {
    const response = await api({
      method: 'GET',
      url: `Emprestimos/${parseResourceId(id)}`,
    });
    emprestimoSchema.parse(response.data);
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
  produtos: IProduto[];
}

export const createLoan = async (data: ICreateLoan) => {
  try {
    const response = await api({
      method: 'POST',
      url: 'Emprestimos',
      data: data,
    });
    return response;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.createLoan);
  }
};

export const getAllLoans = async () => {
  try {
    const response = await api({
      method: 'GET',
      url: `Emprestimos`,
    });
    emprestimosSchema.parse(response.data);
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.allLoans);
  }
};

export const approveLoan = async (EmprestimoId: string | number) => {
  try {
    const rankID = readSession()?.userId;

    if (!rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `/Emprestimos/aprovar/${parseResourceId(EmprestimoId)}`,
      data: {
        aprovadorId: parseResourceId(rankID),
      },
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.approveLoan);
  }
};

export const rejectLoan = async (EmprestimoId: string | number) => {
  try {
    const rankID = readSession()?.userId;

    if (!rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `/Emprestimos/reprovar/${parseResourceId(EmprestimoId)}`,
      data: {
        aprovadorId: parseResourceId(rankID),
      },
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.rejectLoan);
  }
};

export const returnLoan = async (EmprestimoId: string | number) => {
  try {


    const response = await api({
      method: 'PATCH',
      url: `/Emprestimos/devolver/${parseResourceId(EmprestimoId)}`,
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.returnLoan);
  }
};
