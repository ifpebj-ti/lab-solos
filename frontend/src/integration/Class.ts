import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';
import { dependenteSchema } from '@/contracts/user';

import { OPERATION_IDS, type OperationId } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

const dependentesResponseSchema = dependenteSchema.array();

const emptyOnNotFound = (error: unknown, operation: OperationId): [] => {
  const normalized = reportAppError(error, operation);

  if (normalized.category === 'not_found' && normalized.status === 404) {
    return [];
  }

  throw normalized;
};

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
    throw reportAppError(error, OPERATION_IDS.loansByDependents);
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
    return dependentesResponseSchema.parse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.dependents);
  }
};

/** 404 nesta operação representa uma coleção de dependentes vazia. */
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
    return dependentesResponseSchema.parse(response.data);
  } catch (error) {
    return emptyOnNotFound(error, OPERATION_IDS.dependentsById);
  }
};

/** 404 nesta operação representa uma coleção de cadastros vazia para aprovação. */
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
    return dependentesResponseSchema.parse(response.data);
  } catch (error) {
    return emptyOnNotFound(error, OPERATION_IDS.dependentsForApproval);
  }
};

/** 404 nesta operação representa uma coleção de usuários vazia para aprovação. */
export const getAllUsersForApproval = async () => {
  try {
    const doorKey = Cookie.get('doorKey');
    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/aprovacao`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return dependentesResponseSchema.parse(response.data);
  } catch (error) {
    return emptyOnNotFound(error, OPERATION_IDS.usersForApproval);
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
    throw reportAppError(error, OPERATION_IDS.approveDependent);
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
    throw reportAppError(error, OPERATION_IDS.rejectDependent);
  }
};

interface IIdMentorClass {
  id: string | number;
}

export const getLoansByClass = async ({ id }: IIdMentorClass) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/${id}/dependentes/emprestimos`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.loansByClass);
  }
};
