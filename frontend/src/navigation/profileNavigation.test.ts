import { describe, expect, it } from 'vitest';

import {
  buildDetailUrl,
  getIdFromLocation,
  getProfileShortcuts,
  readIdFromLocation,
  resolveParentPath,
} from './profileNavigation';

describe('profile navigation catalog', () => {
  it.each([
    [
      'Administrador',
      [
        '/admin/register-request',
        '/admin/loans-request',
        '/admin/search-material',
        '/admin/users',
        '/admin/all-loans',
        '/admin/follow-up',
      ],
    ],
    [
      'Mentor',
      [
        '/mentor/my-class',
        '/mentor/users-request',
        '/mentor/loan/creation',
        '/mentor/history/class',
        '/mentor/search-material',
      ],
    ],
    [
      'Mentorado',
      [
        '/mentee/search-material',
        '/mentee/history/mentoring',
        '/mentee/profile',
      ],
    ],
  ])('exposes the operational shortcuts for %s in order', (role, paths) => {
    expect(getProfileShortcuts(role).map((shortcut) => shortcut.to)).toEqual(
      paths
    );
  });

  it('does not expose operational shortcuts for unsupported profiles', () => {
    expect(getProfileShortcuts('Comum')).toEqual([]);
    expect(getProfileShortcuts('Perfil desconhecido')).toEqual([]);
    expect(getProfileShortcuts(undefined)).toEqual([]);
  });
});

describe('parent route resolution', () => {
  it.each([
    ['/admin/history/loan', 'Administrador', '/admin/all-loans'],
    ['/mentor/history/loan', 'Mentor', '/mentor/history/class'],
    ['/mentee/history/loan', 'Mentorado', '/mentee/history/mentoring'],
    ['/admin/history/mentoring', 'Administrador', '/admin/users'],
    ['/mentor/history/mentoring', 'Mentor', '/mentor/my-class'],
    ['/admin/view-class', 'Administrador', '/admin/users'],
    ['/admin/view-class-mentor', 'Administrador', '/admin/users'],
    ['/admin/view-history-class-by-id', 'Administrador', '/admin/users'],
    ['/admin/return', 'Administrador', '/admin/all-loans'],
    ['/admin/verification', 'Administrador', '/admin/search-material'],
    ['/mentor/verification', 'Mentor', '/mentor/search-material'],
    ['/mentee/verification', 'Mentorado', '/mentee/search-material'],
    ['/admin/products/42/history', 'Administrador', '/admin/search-material'],
    ['/mentor/my-class/disabled', 'Mentor', '/mentor/my-class'],
    ['/admin/insert', 'Administrador', '/admin/search-material'],
    ['/admin/follow-up', 'Administrador', '/admin/search-material'],
    ['/admin/register-request', 'Administrador', '/admin/users'],
    ['/admin/loans-request', 'Administrador', '/admin/all-loans'],
    ['/mentor/users-request', 'Mentor', '/mentor/my-class'],
    ['/mentor/loan/creation', 'Mentor', '/mentor/'],
    ['/mentor/loan/histories', 'Mentor', '/mentor/'],
    ['/mentor/history/class', 'Mentor', '/mentor/'],
    ['/mentee/history/mentoring', 'Mentorado', '/mentee/'],
  ])('resolves %s to %s', (pathname, role, expected) => {
    expect(resolveParentPath(pathname, role)).toBe(expected);
  });

  it('normalizes repeated and trailing slashes and ignores query parameters', () => {
    expect(
      resolveParentPath('/admin//products/42/history/?tab=expired', 'Administrador')
    ).toBe('/admin/search-material');
  });

  it('falls back to the real profile home instead of crossing profile boundaries', () => {
    expect(resolveParentPath('/admin/return', 'Mentor')).toBe('/mentor/');
    expect(resolveParentPath('/unknown/route', 'Mentorado')).toBe('/mentee/');
    expect(resolveParentPath('https://external.invalid/return', 'Mentor')).toBe(
      '/mentor/'
    );
    expect(resolveParentPath('/admin/return', 'Comum')).toBe('/');
    expect(resolveParentPath('/unknown/route', 'Perfil desconhecido')).toBe('/');
  });
});

describe('recoverable detail URLs', () => {
  it('adds an id while preserving other query parameters and the hash', () => {
    expect(
      buildDetailUrl('/admin/history/loan?tab=active#details', 42)
    ).toBe('/admin/history/loan?tab=active&id=42#details');
  });

  it('replaces duplicate ids rather than appending another id', () => {
    expect(buildDetailUrl('/admin/history/loan?id=1&tab=active&id=2', 42)).toBe(
      '/admin/history/loan?id=42&tab=active'
    );
  });

  it('rejects invalid ids and external destinations', () => {
    expect(() => buildDetailUrl('/admin/history/loan', 0)).toThrow();
    expect(() => buildDetailUrl('/admin/history/loan', 2147483648)).toThrow();
    expect(() => buildDetailUrl('https://external.invalid/detail', 42)).toThrow();
  });

  it.each([
    ['', undefined, null, 'none', false],
    ['?id=42', { id: 7 }, 42, 'query', true],
    ['', { id: 42 }, 42, 'state', true],
    ['?id=invalid', { id: 42 }, null, 'query', false],
    ['?id=1&id=2', { id: 42 }, null, 'query', false],
    ['?id=0', undefined, null, 'query', false],
    ['?id=2147483648', undefined, null, 'query', false],
    ['?id=-1', undefined, null, 'query', false],
    ['?id=1.5', undefined, null, 'query', false],
    ['?id=1e2', undefined, null, 'query', false],
  ])(
    'reads query before legacy state for search %s',
    (search, state, id, source, isValid) => {
      expect(readIdFromLocation({ search, state })).toMatchObject({
        id,
        source,
        isValid,
      });
    }
  );

  it('accepts a direct state id and exposes a scalar helper for consumers', () => {
    expect(readIdFromLocation('?tab=active', { id: '2147483647' })).toMatchObject({
      id: 2147483647,
      source: 'state',
      isValid: true,
    });
    expect(getIdFromLocation({ search: '?id=12', state: { id: 99 } })).toBe(12);
    expect(getIdFromLocation({ search: '?id=bad', state: { id: 99 } })).toBeNull();
  });
});
