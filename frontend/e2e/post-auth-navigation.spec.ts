import { expect, test } from '@playwright/test';

import {
  classLoansFixtures,
  postAuthProfiles,
  preparePostAuthSession,
} from './post-auth-navigation-support';

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '1440', width: 1440, height: 900 },
] as const;

for (const profile of postAuthProfiles) {
  for (const viewport of viewports) {
    test(`atalhos de ${profile.name} permanecem navegáveis em ${viewport.name}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await preparePostAuthSession(page, profile.role);
      await page.goto(profile.home);

      for (const shortcut of profile.shortcuts) {
        await expect(page.locator(`a[href="${shortcut}"]`).first()).toBeVisible();
      }
    });
  }
}

for (const viewport of viewports) {
  test(`admin preserva ID na URL, refresh e retorno em ${viewport.name}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await preparePostAuthSession(page, 'Administrador');
    await page.goto('/admin/loans-request');

    const detailLink = page.locator('a[href="/admin/history/loan?id=701"]');
    await expect(detailLink).toBeVisible();
    await detailLink.click();
    await expect(page).toHaveURL(/\/admin\/history\/loan\?id=701$/);

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/history\/loan\?id=701$/);
    await expect(page.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/all-loans'
    );
  });
}

test('mentor redireciona o alias legado e bloqueia acesso de outro perfil', async ({
  page,
}) => {
  await preparePostAuthSession(page, 'Mentor');
  await page.goto('/mentor/history/mentee?id=3401');
  await expect(page).toHaveURL(/\/mentor\/history\/class$/);

  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: /Acesso negado/i })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Voltar para minha área' })
  ).toHaveAttribute('href', '/mentor/');
});

test('falha transitória mantém a sessão e oferece retry contextual', async ({
  page,
}) => {
  let failed = true;
  await preparePostAuthSession(page, 'Mentor');
  await page.route('**/api/Usuarios/4242/dependentes/emprestimos', (route) => {
    if (failed) {
      failed = false;
      return route.fulfill({ status: 503, json: { title: 'erro remoto' } });
    }
    return route.fulfill({ json: classLoansFixtures });
  });

  await page.goto('/mentor/history/class');
  await expect(page.getByRole('alert')).toContainText(/empréstimos|carregar/i);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('a[href="/mentor/history/loan?id=3401"]')).toBeVisible();
  await expect(page.context().cookies()).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'doorKey' }),
      expect.objectContaining({ name: 'rankID' }),
      expect.objectContaining({ name: 'level' }),
    ])
  );
});
