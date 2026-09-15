import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';
import {
  academicoSchema,
  dependenteSchema,
  usuarioSchema,
} from '@/contracts/user';

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

const parseUserResponse = (data: unknown) => {
  const academicResult = academicoSchema.safeParse(data);

  if (academicResult.success) {
    return academicResult.data;
  }

  const user = usuarioSchema.parse(data);

  if (user.tipoUsuario === 'Academico') {
    throw academicResult.error;
  }

  return user;
};

const parseUserListResponse = (data: unknown) => {
  if (!Array.isArray(data)) {
    return usuarioSchema.array().parse(data);
  }

  return data.map(parseUserResponse);
};

interface IUserById {
  id: string | number;
}

interface IUpdateUserStatus {
  userId: number;
  status: string;
}

/** 404 nesta operação representa uma coleção de cadastros vazia para aprovação. */
export const getDependentesForApproval = async (rankID: string | number) => {
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

const mutateDependentApproval = async (
  solicitanteId: string | number,
  action: 'aprovar' | 'rejeitar',
  operation: OperationId
) => {
  try {
    const doorKey = Cookie.get('doorKey');
    const rankID = Cookie.get('rankID');

    if (!doorKey || !rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `Usuarios/dependentes/${solicitanteId}/${action}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
      data: {
        aprovadorId: Number(rankID),
      },
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, operation);
  }
};

export const approveDependente = (solicitanteId: string | number) =>
  mutateDependentApproval(
    solicitanteId,
    'aprovar',
    OPERATION_IDS.approveDependent
  );

export const rejectDependente = (solicitanteId: string | number) =>
  mutateDependentApproval(
    solicitanteId,
    'rejeitar',
    OPERATION_IDS.rejectDependent
  );

export const getRegisteredUsers = async () => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: 'Usuarios',
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return parseUserListResponse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.registeredUsers);
  }
};

export const getUserById = async ({ id }: IUserById) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/${id}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return parseUserResponse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.userById);
  }
};

export const updateUserStatus = async ({
  userId,
  status,
}: IUpdateUserStatus) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `Usuarios/${userId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
        'Content-Type': 'application/json-patch+json',
      },
      data: [
        {
          op: 'replace',
          path: '/status',
          value: status,
        },
      ],
    });
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.updateUserStatus);
  }
};

export const getCurrentUser = async () => {
  const doorKey = Cookie.get('doorKey');

  if (!doorKey) {
    throw reportAppError(
      new Error('Usuário não autenticado.'),
      OPERATION_IDS.currentUser
    );
  }

  let userId: string | number;
  try {
    // Decodificar o token para obter o ID do usuário
    const base64Url = doorKey.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload) as { sub: string | number };
    userId = payload.sub;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.currentUser);
  }

  // Buscar dados completos do usuário; o adaptador delegado já normaliza sua resposta.
  return getUserById({ id: userId });
};
