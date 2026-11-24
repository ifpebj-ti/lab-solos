import { NavigateFunction } from 'react-router-dom';

import { consumeIntendedRoute } from '@/auth/intendedRoute';
import { clearSession, startSession } from '@/auth/session';
import type { CreateAcademicUserData } from '@/contracts/userRegistration';
import { normalizeError } from '@/errors/normalizeError';
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
  try {
    const response = await api({
      method,
      url: 'Auth/login',
      data: params,
    });

    const login = response.data as LoginResponse;
    if (typeof login.requiresPasswordChange !== 'boolean') {
      throw new Error('Resposta de autenticacao invalida.');
    }

    const sessionResponse = await api.get('Auth/session');
    const session = startSession(sessionResponse.data);
    if (
      !session ||
      session.requiresPasswordChange !== login.requiresPasswordChange
    ) {
      clearSession();
      throw new Error('Sessao de autenticacao invalida.');
    }

    const intendedRoute = session.requiresPasswordChange
      ? null
      : consumeIntendedRoute(session.role);
    navigate(
      session.requiresPasswordChange
        ? '/change-password-required'
        : intendedRoute ?? getHomePathForRole(session.role)
    );
    return response;
  } catch (error: unknown) {
    throw normalizeError(error);
  }
};

export const logoutSession = async (): Promise<void> => {
  try {
    await api.post('Auth/logout', undefined);
    clearSession({ discardAuthContext: true });
  } catch (error: unknown) {
    throw normalizeError(error);
  }
};

export const renewSession = async () => {
  try {
    await api.post('Auth/renew', undefined);
    const response = await api.get('Auth/session');
    const session = startSession(response.data);
    if (!session) throw new Error('Resposta de sessao invalida.');
    return session;
  } catch (error: unknown) {
    throw normalizeError(error);
  }
};

export const createMentor = async (data: CreateAcademicUserData) => {
  try {
    const response = await api.post('/Usuarios', data);
    return response;
  } catch (error: unknown) {
    throw normalizeError(error);
  }
};

export const requestPasswordReset = async (data: IPasswordResetRequest) => {
  try {
    return await api.post('/Email/request-password-reset', data);
  } catch (error: unknown) {
    throw normalizeError(error);
  }
};

export const resetPassword = async (data: IPasswordResetParams) => {
  try {
    return await api.post('/Email/reset-password', {
      email: data.email,
      code: data.token,
      newPassword: data.newPassword,
      confirmation: data.confirmation,
    });
  } catch (error: unknown) {
    throw normalizeError(error);
  }
};
