import axios from 'axios';

import {
  saveAuthNotice,
  saveIntendedRoute,
} from '@/auth/intendedRoute';
import { clearSession } from '@/auth/session';
import { normalizeError } from '@/errors/normalizeError';

const baseURL =
  window.env?.VITE_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080/api/';

export const api = axios.create({
  baseURL: baseURL,
});

let sessionExpirationRedirected = false;

const getRequestUrl = (error: unknown): unknown => {
  try {
    if (!error || typeof error !== 'object') return undefined;
    const config = Reflect.get(error, 'config');
    return config && typeof config === 'object'
      ? Reflect.get(config, 'url')
      : undefined;
  } catch {
    return undefined;
  }
};

const getRequestPath = (url: unknown): string | null => {
  if (typeof url !== 'string' || url.length === 0) return null;

  try {
    const origin = window.location.origin || 'http://localhost';
    return new URL(url, origin).pathname;
  } catch {
    return null;
  }
};

const isLoginRequest = (url: unknown): boolean => {
  const path = getRequestPath(url);
  if (!path) return false;

  const normalizedPath = path.replace(/\/+$/, '').toLowerCase();
  return (
    normalizedPath === '/auth/login' ||
    normalizedPath.endsWith('/auth/login')
  );
};

const isLoginPage = (): boolean => {
  const pathname = window.location.pathname;
  return pathname === '/' || pathname === '/login';
};

const getCurrentRoute = (): string => {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
};

const redirectAfterSessionExpiration = (): void => {
  if (sessionExpirationRedirected) return;
  sessionExpirationRedirected = true;

  try {
    saveIntendedRoute(getCurrentRoute());
  } catch {
    // A storage failure must not prevent session termination.
  }

  try {
    saveAuthNotice();
  } catch {
    // A storage failure must not prevent session termination.
  }

  try {
    clearSession();
  } catch {
    // A cleanup failure must not prevent the navigation to authentication.
  }

  try {
    window.location.replace('/');
  } catch {
    // Navigation may be unavailable in a non-browser test environment.
  }
};

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalizedError = normalizeError(error);
    const requestUrl = getRequestUrl(error);
    const isPrivate401 =
      normalizedError.status === 401 &&
      !isLoginRequest(requestUrl) &&
      !isLoginPage();

    if (isPrivate401) redirectAfterSessionExpiration();

    return Promise.reject(normalizedError);
  }
);
