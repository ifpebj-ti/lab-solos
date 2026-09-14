import { getHomePathForRole } from '@/integration/Auth';

export const MAX_NAVIGATION_ID = 2_147_483_647;

export type SupportedProfile = 'Administrador' | 'Mentor' | 'Mentorado';

export interface ProfileShortcut {
  readonly label: string;
  readonly to: string;
}

const ADMIN_SHORTCUTS = [
  { label: 'Solicitações de cadastro', to: '/admin/register-request' },
  { label: 'Solicitações de empréstimo', to: '/admin/loans-request' },
  { label: 'Produtos', to: '/admin/search-material' },
  { label: 'Usuários', to: '/admin/users' },
  { label: 'Histórico de empréstimos', to: '/admin/all-loans' },
  { label: 'Alertas de produtos', to: '/admin/follow-up' },
] as const satisfies readonly ProfileShortcut[];

const MENTOR_SHORTCUTS = [
  { label: 'Minha turma', to: '/mentor/my-class' },
  { label: 'Solicitações de cadastro', to: '/mentor/users-request' },
  { label: 'Criar empréstimo', to: '/mentor/loan/creation' },
  { label: 'Histórico da turma', to: '/mentor/history/class' },
  { label: 'Pesquisar material', to: '/mentor/search-material' },
] as const satisfies readonly ProfileShortcut[];

const MENTEE_SHORTCUTS = [
  { label: 'Pesquisar material', to: '/mentee/search-material' },
  { label: 'Histórico pessoal', to: '/mentee/history/mentoring' },
  { label: 'Meu perfil', to: '/mentee/profile' },
] as const satisfies readonly ProfileShortcut[];

export const PROFILE_SHORTCUTS = {
  Administrador: ADMIN_SHORTCUTS,
  Mentor: MENTOR_SHORTCUTS,
  Mentorado: MENTEE_SHORTCUTS,
} as const;

export const getProfileShortcuts = (
  role: string | null | undefined
): readonly ProfileShortcut[] => {
  switch (role) {
    case 'Administrador':
      return PROFILE_SHORTCUTS.Administrador;
    case 'Mentor':
      return PROFILE_SHORTCUTS.Mentor;
    case 'Mentorado':
      return PROFILE_SHORTCUTS.Mentorado;
    default:
      return [];
  }
};

export const PARENT_ROUTES: Readonly<Record<string, string>> = {
  '/admin/history/loan': '/admin/all-loans',
  '/mentor/history/loan': '/mentor/history/class',
  '/mentee/history/loan': '/mentee/history/mentoring',
  '/admin/history/mentoring': '/admin/users',
  '/mentor/history/mentoring': '/mentor/my-class',
  '/admin/view-class': '/admin/users',
  '/admin/view-class-mentor': '/admin/users',
  '/admin/view-history-class-by-id': '/admin/users',
  '/admin/return': '/admin/all-loans',
  '/admin/verification': '/admin/search-material',
  '/mentor/verification': '/mentor/search-material',
  '/mentee/verification': '/mentee/search-material',
  '/mentor/my-class/disabled': '/mentor/my-class',
  '/admin/insert': '/admin/search-material',
  '/admin/follow-up': '/admin/search-material',
  '/admin/register-request': '/admin/users',
  '/admin/loans-request': '/admin/all-loans',
  '/mentor/users-request': '/mentor/my-class',
  '/mentor/loan/creation': '/mentor/',
  '/mentor/loan/histories': '/mentor/',
  '/mentor/history/class': '/mentor/',
  '/mentee/history/mentoring': '/mentee/',
};

const PROFILE_PREFIXES = [
  { role: 'Administrador', prefix: '/admin' },
  { role: 'Mentor', prefix: '/mentor' },
  { role: 'Mentorado', prefix: '/mentee' },
] as const satisfies readonly {
  role: SupportedProfile;
  prefix: string;
}[];

const isSupportedProfile = (
  role: string | null | undefined
): role is SupportedProfile =>
  role === 'Administrador' || role === 'Mentor' || role === 'Mentorado';

const splitLocation = (value: string): {
  pathname: string;
  search: string;
  hash: string;
} => {
  const hashIndex = value.indexOf('#');
  const withoutHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : value.slice(hashIndex);
  const queryIndex = withoutHash.indexOf('?');

  return {
    pathname: queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex),
    search: queryIndex === -1 ? '' : withoutHash.slice(queryIndex),
    hash,
  };
};

export const normalizePathname = (value: string): string => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    throw new Error('O destino deve ser uma rota interna.');
  }

  const { pathname } = splitLocation(value);
  const normalized = pathname.replace(/\/{2,}/g, '/');
  if (normalized === '') return '/';
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : '/';
};

const profileForPath = (pathname: string): SupportedProfile | undefined => {
  return PROFILE_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.role;
};

const isProductHistoryPath = (pathname: string): boolean =>
  /^\/admin\/products\/[^/]+\/history$/.test(pathname);

const parentForPath = (pathname: string): string | undefined =>
  PARENT_ROUTES[pathname] ??
  (isProductHistoryPath(pathname) ? '/admin/search-material' : undefined);

export const resolveParentPath = (
  pathname: string,
  role?: string | null
): string => {
  const homeForRole = () => getHomePathForRole(role ?? '');
  let normalizedPath: string;
  try {
    normalizedPath = normalizePathname(pathname);
  } catch {
    return homeForRole();
  }

  const routeProfile = profileForPath(normalizedPath);
  if (role !== undefined && role !== null && routeProfile && role !== routeProfile) {
    return homeForRole();
  }

  const explicitParent = parentForPath(normalizedPath);
  if (explicitParent) return explicitParent;

  if (isSupportedProfile(role)) return getHomePathForRole(role);
  if (routeProfile) return getHomePathForRole(routeProfile);
  return homeForRole();
};

export interface LocationLike {
  readonly pathname?: string;
  readonly search?: string | null;
  readonly state?: unknown;
}

export type IdSource = 'query' | 'state' | 'none';

export interface IdResolution {
  readonly id: number | null;
  readonly source: IdSource;
  readonly isValid: boolean;
  readonly queryPresent: boolean;
}

export const parsePositiveId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= MAX_NAVIGATION_ID
      ? value
      : null;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= MAX_NAVIGATION_ID
    ? parsed
    : null;
};

const stateId = (state: unknown): { present: boolean; value?: unknown } => {
  if (state === undefined || state === null) return { present: false };
  if (typeof state === 'object' && !Array.isArray(state)) {
    const record = state as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(record, 'id')
      ? { present: true, value: record.id }
      : { present: false };
  }
  return { present: true, value: state };
};

export function readIdFromLocation(location: LocationLike): IdResolution;
export function readIdFromLocation(search: string, state?: unknown): IdResolution;
export function readIdFromLocation(
  locationOrSearch: LocationLike | string,
  legacyState?: unknown
): IdResolution {
  const search =
    typeof locationOrSearch === 'string'
      ? locationOrSearch
      : locationOrSearch.search ?? '';
  const state =
    typeof locationOrSearch === 'string'
      ? legacyState
      : locationOrSearch.state;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const queryIds = params.getAll('id');

  if (params.has('id')) {
    const id = queryIds.length === 1 ? parsePositiveId(queryIds[0]) : null;
    return {
      id,
      source: 'query',
      isValid: id !== null,
      queryPresent: true,
    };
  }

  const legacy = stateId(state);
  if (legacy.present) {
    const id = parsePositiveId(legacy.value);
    return {
      id,
      source: 'state',
      isValid: id !== null,
      queryPresent: false,
    };
  }

  return { id: null, source: 'none', isValid: false, queryPresent: false };
}

export function getIdFromLocation(location: LocationLike): number | null;
export function getIdFromLocation(search: string, state?: unknown): number | null;
export function getIdFromLocation(
  locationOrSearch: LocationLike | string,
  legacyState?: unknown
): number | null {
  const resolution =
    typeof locationOrSearch === 'string'
      ? readIdFromLocation(locationOrSearch, legacyState)
      : readIdFromLocation(locationOrSearch);
  return resolution.id;
}

export const buildDetailUrl = (route: string, id: unknown): string => {
  const parsedId = parsePositiveId(id);
  if (parsedId === null) throw new Error('O identificador deve ser um inteiro positivo.');

  const { pathname, search, hash } = splitLocation(route);
  const normalizedPath = normalizePathname(pathname);
  const params = new URLSearchParams(search);
  params.set('id', String(parsedId));
  return `${normalizedPath}?${params.toString()}${hash}`;
};

export const buildUrlWithId = buildDetailUrl;
