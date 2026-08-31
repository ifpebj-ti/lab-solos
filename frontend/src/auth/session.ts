import Cookie from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

const AUTH_COOKIE_KEYS = ['doorKey', 'rankID', 'level'] as const;
type CookieOptions = NonNullable<Parameters<typeof Cookie.set>[2]>;

type SessionJwtPayload = {
  sub?: unknown;
  role?: unknown;
  password_change_required?: unknown;
};

export type Session = {
  token: string;
  userId: string;
  role: string;
  requiresPasswordChange: boolean;
};

const cookieOptions = (): CookieOptions => ({
  path: '/',
  sameSite: 'Strict',
  secure: window.location.protocol === 'https:',
});

const decodeSession = (token: string): Session | null => {
  if (!token) return null;

  try {
    const payload = jwtDecode<SessionJwtPayload>(token);

    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
      return null;
    }

    const passwordChangeRequired = payload.password_change_required;
    if (
      passwordChangeRequired !== undefined &&
      typeof passwordChangeRequired !== 'boolean' &&
      passwordChangeRequired !== 'true' &&
      passwordChangeRequired !== 'false'
    ) {
      return null;
    }

    return {
      token,
      userId: payload.sub,
      role: payload.role,
      requiresPasswordChange:
        passwordChangeRequired === true || passwordChangeRequired === 'true',
    };
  } catch {
    return null;
  }
};

export const startSession = (token: string): Session | null => {
  const session = decodeSession(token);
  if (!session) {
    clearSession();
    return null;
  }

  const options = cookieOptions();
  Cookie.set('doorKey', session.token, options);
  Cookie.set('rankID', session.userId, options);
  Cookie.set('level', session.role, options);

  return session;
};

export const readSession = (): Session | null => {
  const session = decodeSession(Cookie.get('doorKey') ?? '');
  if (!session) return null;

  if (
    Cookie.get('rankID') !== session.userId ||
    Cookie.get('level') !== session.role
  ) {
    return null;
  }

  return session;
};

export const clearSession = (): void => {
  const options = cookieOptions();
  for (const key of AUTH_COOKIE_KEYS) Cookie.remove(key, options);
};
