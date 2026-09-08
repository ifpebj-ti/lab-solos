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
  try {
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
      throw new Error('Resposta de autenticacao invalida.');
    }

    const session = startSession(login.token);
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
    return await api.post('/Email/reset-password', data);
  } catch (error: unknown) {
    throw normalizeError(error);
  }
};
