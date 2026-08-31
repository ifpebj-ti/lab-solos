import { NavigateFunction } from 'react-router-dom';

import { clearSession, startSession } from '@/auth/session';
import type { CreateAcademicUserData } from '@/contracts/userRegistration';
import { api } from '../services/BaseApi';

interface IAuthParams {
  email: string;
  password: string;
}

interface IAuth {
  method: string;
  params: IAuthParams;
}

interface IPasswordResetRequest {
  email: string;
}

interface IPasswordResetParams {
  email: string;
  token: string;
  newPassword: string;
  confirmation: string;
}

type LoginResponse = {
  token?: unknown;
  requiresPasswordChange?: unknown;
};

export const getHomePathForRole = (role: string): string => {
  switch (role) {
    case 'Administrador':
      return '/admin/';
    case 'Mentor':
      return '/mentor/';
    case 'Mentorado':
      return '/mentee/';
    default:
      return '/';
  }
};

export const authenticate = async (
  { method, params }: IAuth,
  navigate: NavigateFunction
) => {
  const response = await api({
    method,
    url: 'Auth/login',
    data: params,
  });

  const login = response.data as LoginResponse;
  if (
    typeof login.token !== 'string' ||
    typeof login.requiresPasswordChange !== 'boolean'
  ) {
    throw new Error('Resposta de autentica\u00e7\u00e3o inv\u00e1lida.');
  }

  const session = startSession(login.token);
  if (
    !session ||
    session.requiresPasswordChange !== login.requiresPasswordChange
  ) {
    clearSession();
    throw new Error('Sess\u00e3o de autentica\u00e7\u00e3o inv\u00e1lida.');
  }

  navigate(
    session.requiresPasswordChange
      ? '/change-password-required'
      : getHomePathForRole(session.role)
  );
  return response;
};

export const createMentor = async (data: CreateAcademicUserData) => {
  try {
    const response = await api.post('/Usuarios', data);
    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao criar mentor', error);
    }
    throw error;
  }
};

export const requestPasswordReset = (data: IPasswordResetRequest) =>
  api.post('/Email/request-password-reset', data);

export const resetPassword = (data: IPasswordResetParams) =>
  api.post('/Email/reset-password', data);
