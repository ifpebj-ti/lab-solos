import { readSession } from '@/auth/session';
import { api } from '../services/BaseApi';
import { parseResourceId } from '@/contracts/identifier';
import {
  academicoSchema,
  dependenteSchema,
  usuarioSchema,
  usuarioAcompanhamentoSchema,
} from '@/contracts/user';

import { OPERATION_IDS, type OperationId } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

const dependentesResponseSchema = dependenteSchema.array();

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

export interface UpdateOwnUserProfileInput {
  userId: number;
  currentName: string;
  currentEmail: string;
  currentPhone: string | null;
  nomeCompleto: string;
  email: string;
  telefone: string | null;
  currentPassword?: string;
}

export const getDependentesForApproval = async (rankID: string | number) => {
  try {


    const response = await api({
      method: 'GET',
      url: `Usuarios/${parseResourceId(rankID)}/dependentes/aprovacao`,
    });

    return dependentesResponseSchema.parse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.dependentsForApproval);
  }
};

const mutateDependentApproval = async (
  solicitanteId: string | number,
  action: 'aprovar' | 'rejeitar',
  operation: OperationId
) => {
  try {
    const rankID = readSession()?.userId;

    if (!rankID) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `Usuarios/dependentes/${parseResourceId(solicitanteId)}/${action}`,
      data: {
        aprovadorId: parseResourceId(rankID),
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

    const response = await api({
      method: 'GET',
      url: 'Usuarios',
    });
    return parseUserListResponse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.registeredUsers);
  }
};

export const getUserById = async ({ id }: IUserById) => {
  try {

    const response = await api({
      method: 'GET',
      url: `Usuarios/${parseResourceId(id)}`,
    });
    return parseUserResponse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.userById);
  }
};

export const getUserForMentoring = async ({ id }: IUserById) => {
  try {


    const response = await api({
      method: 'GET',
      url: `Usuarios/${parseResourceId(id)}`,
    });
    return usuarioAcompanhamentoSchema.parse(response.data);
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.userById);
  }
};

export const updateUserStatus = async ({
  userId,
  status,
}: IUpdateUserStatus) => {
  try {


    const response = await api({
      method: 'PATCH',
      url: `Usuarios/${parseResourceId(userId)}`,
      headers: {
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

export const updateOwnUserProfile = async ({
  userId,
  currentName,
  currentEmail,
  currentPhone,
  nomeCompleto,
  email,
  telefone,
  currentPassword,
}: UpdateOwnUserProfileInput) => {
  const emailChanged = email !== currentEmail;
  if (emailChanged && !currentPassword) {
    throw new Error('Informe a senha atual para alterar o e-mail.');
  }

  const operations: Array<{
    op: 'replace';
    path: '/nomeCompleto' | '/email' | '/telefone' | '/senhaAtual';
    value: string | null;
  }> = [];

  if (nomeCompleto !== currentName) {
    operations.push({ op: 'replace', path: '/nomeCompleto', value: nomeCompleto });
  }
  if (emailChanged) {
    operations.push({ op: 'replace', path: '/email', value: email });
    operations.push({
      op: 'replace',
      path: '/senhaAtual',
      value: currentPassword!,
    });
  }
  if (telefone !== currentPhone) {
    operations.push({ op: 'replace', path: '/telefone', value: telefone });
  }

  if (operations.length === 0) return;

  try {

    await api({
      method: 'PATCH',
      url: `Usuarios/${parseResourceId(userId)}`,
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
      data: operations,
    });
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.userById);
  }
};

export const getCurrentUser = async () => {
  const userId = readSession()?.userId;
  if (!userId) {
    throw reportAppError(
      new Error('Usuário não autenticado.'),
      OPERATION_IDS.currentUser
    );
  }

  return getUserById({ id: userId });
};
