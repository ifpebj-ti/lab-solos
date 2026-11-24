import Cookie from 'js-cookie';

import {
  discardAuthNotice,
  discardIntendedRoute,
} from './intendedRoute';

const SESSION_STORAGE_KEY = 'auth:session-context';
const CSRF_STORAGE_KEY = 'auth:csrf-token';
const LEGACY_AUTH_COOKIE_KEYS = ['doorKey', 'rankID', 'level'] as const;

export type Session = Readonly<{
  userId: string;
  role: string;
  requiresPasswordChange: boolean;
}>;

export type SessionBootstrap = Omit<Session, 'userId'> &
  Readonly<{ userId: string | number; csrfToken: string }>;

export type ClearSessionOptions = Readonly<{
  discardAuthContext?: boolean;
}>;

const isSessionBootstrap = (value: unknown): value is SessionBootstrap => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    ((typeof candidate.userId === 'string' && candidate.userId.length > 0) ||
      (typeof candidate.userId === 'number' &&
        Number.isSafeInteger(candidate.userId) &&
        candidate.userId > 0)) &&
    typeof candidate.role === 'string' &&
    candidate.role.length > 0 &&
    typeof candidate.requiresPasswordChange === 'boolean' &&
    typeof candidate.csrfToken === 'string' &&
    candidate.csrfToken.length > 0
  );
};

/** Store only display/navigation context and the session-bound CSRF proof. */
export const startSession = (value: unknown): Session | null => {
  if (!isSessionBootstrap(value)) {
    clearSession();
    return null;
  }

  const session: Session = {
    userId: String(value.userId),
    role: value.role,
    requiresPasswordChange: value.requiresPasswordChange,
  };

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    sessionStorage.setItem(CSRF_STORAGE_KEY, value.csrfToken);
  } catch {
    clearSession();
    return null;
  }

  clearLegacyAuthCookies();
  return session;
};

export const readSession = (): Session | null => {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null'
    );
    if (!value || typeof value !== 'object') return null;

    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.userId !== 'string' ||
      candidate.userId.length === 0 ||
      typeof candidate.role !== 'string' ||
      candidate.role.length === 0 ||
      typeof candidate.requiresPasswordChange !== 'boolean'
    ) {
      return null;
    }

    return {
      userId: candidate.userId,
      role: candidate.role,
      requiresPasswordChange: candidate.requiresPasswordChange,
    };
  } catch {
    return null;
  }
};

export const readCsrfToken = (): string | null => {
  try {
    const token = sessionStorage.getItem(CSRF_STORAGE_KEY);
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
};

const clearLegacyAuthCookies = (): void => {
  const options = { path: '/', sameSite: 'Lax' as const, secure: window.location.protocol === 'https:' };
  for (const key of LEGACY_AUTH_COOKIE_KEYS) {
    try {
      Cookie.remove(key, options);
    } catch {
      // Continue cleanup if a browser blocks one legacy cookie operation.
    }
  }
};

export const clearSession = (
  options: ClearSessionOptions = {}
): void => {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // A storage failure must not prevent legacy cookie cleanup or navigation.
  }

  try {
    clearLegacyAuthCookies();
  } catch {
    // A cleanup failure must not prevent the remaining auth cleanup.
  }

  if (options.discardAuthContext) {
    try {
      discardIntendedRoute();
    } catch {
      // Auth cleanup remains best effort when sessionStorage is unavailable.
    }

    try {
      discardAuthNotice();
    } catch {
      // Auth cleanup remains best effort when sessionStorage is unavailable.
    }
  }
};
