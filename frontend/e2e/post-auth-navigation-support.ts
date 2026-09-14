import type { Page } from '@playwright/test';

import {
  classLoansFixtures,
  loanRequestFixtures,
  mockResponsiveSession,
} from './responsive-support';

export { classLoansFixtures };

export const postAuthProfiles = [
  {
    name: 'administrador',
    role: 'Administrador',
    home: '/admin/',
    shortcuts: [
      '/admin/register-request',
      '/admin/loans-request',
      '/admin/search-material',
      '/admin/users',
      '/admin/all-loans',
      '/admin/follow-up',
    ],
  },
  {
    name: 'mentor',
    role: 'Mentor',
    home: '/mentor/',
    shortcuts: [
      '/mentor/my-class',
      '/mentor/users-request',
      '/mentor/loan/creation',
      '/mentor/history/class',
      '/mentor/search-material',
    ],
  },
  {
    name: 'mentorado',
    role: 'Mentorado',
    home: '/mentee/',
    shortcuts: [
      '/mentee/search-material',
      '/mentee/history/mentoring',
      '/mentee/profile',
    ],
  },
] as const;

export async function preparePostAuthSession(
  page: Page,
  role: string
): Promise<void> {
  await mockResponsiveSession(page, role);
  await page.route('**/api/Emprestimos', (route) =>
    route.fulfill({ json: loanRequestFixtures })
  );
  await page.route('**/api/Emprestimos/701', (route) =>
    route.fulfill({ json: loanRequestFixtures[0] })
  );
  await page.route('**/api/Usuarios/*/dependentes/emprestimos', (route) =>
    route.fulfill({ json: classLoansFixtures })
  );
}
