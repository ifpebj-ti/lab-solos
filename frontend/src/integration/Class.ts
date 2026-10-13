import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';
import { emprestimosSchema } from '@/contracts/loan';
import { dependenteSchema } from '@/contracts/user';

import { OPERATION_IDS } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

const dependentesResponseSchema = dependenteSchema.array();

const emptyOnAdminApprovalNotFound = (error: unknown): [] => {
  const normalized = reportAppError(error, OPERATION_IDS.usersForApproval);

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
    emprestimosSchema.parse(response.data);
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
    throw reportAppError(error, OPERATION_IDS.dependentsById);
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
    return dependentesResponseSchema.parse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.dependentsForApproval);
  }
};

/** Mantém o fallback legado da aprovação administrativa sem estendê-lo a vínculos protegidos. */
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
    return emptyOnAdminApprovalNotFound(error);
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
    emprestimosSchema.parse(response.data);
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.loansByClass);
  }
};
