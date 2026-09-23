import {
  ArrowLeftRight,
  House,
  PackageSearch,
  Send,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';

import {
  getProfileShortcuts,
  type ProfileShortcut,
  type SupportedProfile,
} from './profileNavigation';

export type NavigationRole = SupportedProfile | 'Comum';

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
  readonly icon?: LucideIcon;
  readonly children?: readonly NavigationItem[];
}

export interface NavigationGroup extends NavigationItem {
  readonly icon: LucideIcon;
}

const group = (
  id: string,
  label: string,
  to: string,
  icon: LucideIcon,
  children?: readonly NavigationItem[]
): NavigationGroup => ({ id, label, to, icon, children });

const adminGroups: readonly NavigationGroup[] = [
  group('inicio', 'Início', '/admin/', House),
  group('materiais', 'Produtos', '/admin/search-material', PackageSearch, [
    { id: 'produtos', label: 'Meus Produtos', to: '/admin/search-material' },
    { id: 'adicionar', label: 'Adicionar', to: '/admin/insert' },
    { id: 'alertas', label: 'Alertas', to: '/admin/follow-up' },
  ]),
  group('emprestimos', 'Emprestimos', '/admin/all-loans', ArrowLeftRight, [
    { id: 'solicitacoes-emprestimo', label: 'Pedidos de empréstimo', to: '/admin/loans-request' },
    { id: 'historico-emprestimo', label: 'Histórico', to: '/admin/all-loans' },
  ]),
  group('pessoas', 'Usuários', '/admin/users', Users, [
    { id: 'usuarios', label: 'Ver todos', to: '/admin/users' },
    { id: 'solicitacoes-cadastro', label: 'Solicitações de cadastro', to: '/admin/register-request' },
  ]),
  group('auditoria', 'Auditoria', '/admin/auditoria', Shield),
];

const mentorGroups: readonly NavigationGroup[] = [
  group('inicio', 'Início', '/mentor/', House),
  group('materiais', 'Pesquisar Material', '/mentor/search-material', PackageSearch),
  group('emprestimos', 'Empréstimos', '/mentor/loan/creation', Send, [
    { id: 'criar-emprestimo', label: 'Criar Empréstimo', to: '/mentor/loan/creation' },
    { id: 'historico-turma', label: 'Histórico da turma', to: '/mentor/history/class' },
  ]),
  group('minha-turma', 'Minha turma', '/mentor/my-class', Users, [
    { id: 'solicitacoes-usuarios', label: 'Solicitações', to: '/mentor/users-request' },
    { id: 'minha-turma', label: 'Minha turma', to: '/mentor/my-class' },
  ]),
];

const menteeGroups: readonly NavigationGroup[] = [
  group('inicio', 'Início', '/mentee/', House),
  group('materiais', 'Pesquisar Material', '/mentee/search-material', PackageSearch),
  group('meu-historico', 'Histórico Pessoal', '/mentee/history/mentoring', ArrowLeftRight),
];

const navigationByRole: Readonly<Record<NavigationRole, readonly NavigationGroup[]>> = {
  Administrador: adminGroups,
  Mentor: mentorGroups,
  Mentorado: menteeGroups,
  Comum: [],
};

export const getNavigationGroups = (
  role: string | null | undefined
): readonly NavigationGroup[] => {
  if (role === 'Administrador' || role === 'Mentor' || role === 'Mentorado') {
    return navigationByRole[role];
  }
  return [];
};

export const flattenNavigation = (
  groups: readonly NavigationItem[]
): readonly NavigationItem[] =>
  groups.flatMap((item) => [item, ...(item.children ? flattenNavigation(item.children) : [])]);

export interface NavigationSearchEntry {
  readonly value: string;
  readonly label: string;
  readonly to: string;
}

export const getNavigationSearchEntries = (
  role: string | null | undefined
): readonly NavigationSearchEntry[] => {
  const entries = flattenNavigation(getNavigationGroups(role)).map((item) => ({
    value: item.id,
    label: item.label,
    to: item.to,
  }));
  const preferredOrder = getProfileShortcuts(role).map((item) => item.to);

  return [...entries].sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.to);
    const rightIndex = preferredOrder.indexOf(right.to);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
};

export const getProfileShortcutEntries = (
  role: string | null | undefined
): readonly ProfileShortcut[] => getProfileShortcuts(role);
