export const INTENDED_ROUTE_STORAGE_KEY = 'auth:intended-route';
export const AUTH_NOTICE_STORAGE_KEY = 'auth:notice';
export const SESSION_EXPIRED_NOTICE = 'session-expired' as const;

export type AuthNotice = typeof SESSION_EXPIRED_NOTICE;

export type StorageLike = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

const MAX_INTENDED_ROUTE_LENGTH = 2_048;

const PUBLIC_AUTH_PATHS = new Set([
  '/',
  '/login',
  '/forgot-your-password',
  '/reset-password',
  '/create-account',
  '/change-password-required',
]);

const PROFILE_PREFIXES = ['/admin', '/mentor', '/mentee'] as const;

const PROFILE_PREFIX_BY_ROLE: Readonly<Record<string, string>> = {
  Administrador: '/admin',
  Mentor: '/mentor',
  Mentorado: '/mentee',
};

const getSessionStorage = (storage?: StorageLike): StorageLike | null => {
  if (storage) return storage;

  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

const readStorageValue = (
  storage: StorageLike,
  key: string
): string | null => {
  try {
    const value = storage.getItem(key);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
};

const writeStorageValue = (
  storage: StorageLike,
  key: string,
  value: string
): boolean => {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const removeStorageValue = (storage: StorageLike, key: string): void => {
  try {
    storage.removeItem(key);
  } catch {
    // A blocked storage must not prevent login or logout from continuing.
  }
};

const hasProfilePrefix = (
  pathname: string,
  prefix: string
): boolean => pathname === prefix || pathname.startsWith(`${prefix}/`);

const isKnownProfilePath = (pathname: string): boolean =>
  PROFILE_PREFIXES.some((prefix) => hasProfilePrefix(pathname, prefix));

const getOrigin = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    const { origin } = window.location;
    return typeof origin === 'string' && origin.length > 0 ? origin : null;
  } catch {
    return null;
  }
};

const trimTrailingSlashes = (pathname: string): string =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

const getValidatedRoute = (value: unknown, role?: string): string | null => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_INTENDED_ROUTE_LENGTH ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return null;
  }

  const origin = getOrigin();
  if (!origin) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, origin);
  } catch {
    return null;
  }

  if (parsed.origin !== origin) return null;

  const pathname = parsed.pathname;
  const publicPath = trimTrailingSlashes(pathname);
  if (PUBLIC_AUTH_PATHS.has(publicPath) || !isKnownProfilePath(pathname)) {
    return null;
  }

  const expectedPrefix = role === undefined ? undefined : PROFILE_PREFIX_BY_ROLE[role];
  if (
    role !== undefined &&
    (!expectedPrefix || !hasProfilePrefix(pathname, expectedPrefix))
  ) {
    return null;
  }

  const route = `${pathname}${parsed.search}${parsed.hash}`;
  return route.length <= MAX_INTENDED_ROUTE_LENGTH ? route : null;
};

export const validateIntendedRoute = (
  route: unknown,
  role?: string
): string | null => getValidatedRoute(route, role);

export const isValidIntendedRoute = (
  route: unknown,
  role?: string
): boolean => getValidatedRoute(route, role) !== null;

export const saveIntendedRoute = (
  route: unknown,
  storage?: StorageLike
): boolean => {
  const targetStorage = getSessionStorage(storage);
  if (!targetStorage) return false;

  const validRoute = getValidatedRoute(route);
  const existing = readStorageValue(
    targetStorage,
    INTENDED_ROUTE_STORAGE_KEY
  );
  const existingRoute = getValidatedRoute(existing);
  if (existingRoute) return validRoute !== null;
  if (existing !== null) {
    removeStorageValue(targetStorage, INTENDED_ROUTE_STORAGE_KEY);
  }

  return validRoute
    ? writeStorageValue(targetStorage, INTENDED_ROUTE_STORAGE_KEY, validRoute)
    : false;
};

export const consumeIntendedRoute = (
  role: string,
  storage?: StorageLike
): string | null => {
  const targetStorage = getSessionStorage(storage);
  if (!targetStorage) return null;

  const storedRoute = readStorageValue(
    targetStorage,
    INTENDED_ROUTE_STORAGE_KEY
  );
  if (storedRoute === null) return null;

  removeStorageValue(targetStorage, INTENDED_ROUTE_STORAGE_KEY);
  return getValidatedRoute(storedRoute, role);
};

export const discardIntendedRoute = (storage?: StorageLike): void => {
  const targetStorage = getSessionStorage(storage);
  if (targetStorage) {
    removeStorageValue(targetStorage, INTENDED_ROUTE_STORAGE_KEY);
  }
};

export const saveAuthNotice = (storage?: StorageLike): boolean => {
  const targetStorage = getSessionStorage(storage);
  return targetStorage
    ? writeStorageValue(
        targetStorage,
        AUTH_NOTICE_STORAGE_KEY,
        SESSION_EXPIRED_NOTICE
      )
    : false;
};

export const consumeAuthNotice = (
  storage?: StorageLike
): AuthNotice | null => {
  const targetStorage = getSessionStorage(storage);
  if (!targetStorage) return null;

  const notice = readStorageValue(targetStorage, AUTH_NOTICE_STORAGE_KEY);
  if (notice === null) return null;

  removeStorageValue(targetStorage, AUTH_NOTICE_STORAGE_KEY);
  return notice === SESSION_EXPIRED_NOTICE ? notice : null;
};

export const discardAuthNotice = (storage?: StorageLike): void => {
  const targetStorage = getSessionStorage(storage);
  if (targetStorage) {
    removeStorageValue(targetStorage, AUTH_NOTICE_STORAGE_KEY);
  }
};
