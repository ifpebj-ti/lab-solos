import { describe, expect, it } from 'vitest';

import {
  flattenNavigation,
  getNavigationGroups,
  getNavigationSearchEntries,
  getProfileShortcutEntries,
} from './navigationModel';

const roles = ['Administrador', 'Mentor', 'Mentorado'] as const;

describe('navigationModel', () => {
  it.each([
    ['Administrador', ['inicio', 'materiais', 'emprestimos', 'pessoas', 'auditoria']],
    ['Mentor', ['inicio', 'materiais', 'emprestimos', 'minha-turma']],
    ['Mentorado', ['inicio', 'materiais', 'meu-historico']],
  ] as const)('mantém os grupos aprovados para %s', (role, ids) => {
    expect(getNavigationGroups(role).map((group) => group.id)).toEqual(ids);
  });

  it.each(roles)('usa a mesma fonte para menu e busca em %s', (role) => {
    const menuDestinations = new Set(
      flattenNavigation(getNavigationGroups(role)).map((item) => item.to)
    );
    const searchDestinations = new Set(
      getNavigationSearchEntries(role).map((item) => item.to)
    );

    expect(searchDestinations).toEqual(menuDestinations);
  });

  it('preserva a ordem e os destinos dos atalhos operacionais', () => {
    expect(getProfileShortcutEntries('Administrador').map((item) => item.to)).toEqual([
      '/admin/register-request',
      '/admin/loans-request',
      '/admin/search-material',
      '/admin/users',
      '/admin/all-loans',
      '/admin/follow-up',
    ]);
  });
});
