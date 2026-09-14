import { expect, test, type Locator, type Page } from '@playwright/test';

import { mockResponsiveSession } from './responsive-support';

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const profiles = [
  {
    name: 'administrador',
    role: 'Administrador',
    home: '/admin/',
    profile: '/admin/profile',
    search: '/admin/search-material',
    searchTitle: /Pesquisa - Administrador/,
  },
  {
    name: 'mentor',
    role: 'Mentor',
    home: '/mentor/',
    profile: '/mentor/profile',
    search: '/mentor/search-material',
    searchTitle: /Pesquisa - Mentor/,
  },
  {
    name: 'mentorado',
    role: 'Mentorado',
    home: '/mentee/',
    profile: '/mentee/profile',
    search: '/mentee/search-material',
    searchTitle: /Pesquisa - Mentorado/,
  },
] as const;

const productFixture = {
  id: 101,
  nomeProduto: 'Produto sintético operacional',
  tipoProduto: 'Quimico',
  fornecedor: 'Fornecedor sintético',
  quantidade: 3,
  quantidadeMinima: 1,
  localizacaoProduto: 'Armário 1',
  dataFabricacao: '2026-09-01',
  dataValidade: '2027-09-01',
  status: 'Disponivel',
  unidadeMedida: 'ml',
};

const removedRoutes = [
  '/admin/view-info',
  '/admin/create-info',
  '/admin/insert/launch',
  '/boot',
  '/pre',
] as const;

const page404Text = /P[aá]gina n[aã]o encontrada/i;
const removedSurfaceText =
  /UnderDevelopment|Labon Pro|em breve|Importar Planilha|InterLab/i;

async function getSidebar(page: Page, viewport: number) {
  if (viewport < 768) {
    const toggle = page.getByRole('button', { name: 'Abrir/Fechar Menu' });
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
  }

  const sidebar = page.locator('[data-sidebar="sidebar"]');
  await expect(sidebar).toBeVisible();
  return sidebar;
}

async function waitForProfileIdentity(sidebar: Locator, role: string) {
  await expect(sidebar.getByText(role, { exact: true })).toBeVisible();
  await expect(sidebar.getByText(/Pessoa/).first()).toBeVisible();
}

async function openRouteSearch(page: Page, trigger: Locator) {
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Pesquisar Rotas' })
  ).toBeVisible();
}

async function openUserMenu(page: Page, trigger: Locator) {
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
}

for (const profile of profiles) {
  for (const viewport of viewports) {
    test(`menu ${profile.name} permanece operacional em ${viewport.name}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, profile.role);
      await page.goto(profile.home);

      const sidebar = await getSidebar(page, viewport.width);
      await waitForProfileIdentity(sidebar, profile.role);

      await expect(sidebar.getByText(/InterLab/i)).toHaveCount(0);
      await expect(sidebar.getByText('Extras', { exact: true })).toHaveCount(0);

      const userTrigger = sidebar.getByRole('button', { name: /Pessoa/ });
      await openUserMenu(page, userTrigger);
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: 'Conta' })).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: 'Sair' })).toBeVisible();
      await expect(menu.getByText(/Labon Pro|em breve/i)).toHaveCount(0);

      const account = menu.getByRole('menuitem', { name: 'Conta' });
      if (viewport.width >= 768) {
        await account.focus();
        await expect(account).toBeFocused();
      }
      await page.keyboard.press('Escape');
      await expect(menu).not.toBeVisible();
      if (viewport.width < 768) {
        await expect(sidebar).not.toBeVisible();
        const reopenedSidebar = await getSidebar(page, viewport.width);
        const reopenedUserTrigger = reopenedSidebar.getByRole('button', {
          name: /Pessoa/,
        });
        await openUserMenu(page, reopenedUserTrigger);
      } else {
        await expect(userTrigger).toBeFocused();
        await userTrigger.press('Enter');
        await expect(menu).toBeVisible();
      }
      await page
        .getByRole('menu')
        .getByRole('menuitem', { name: 'Conta' })
        .click();
      await expect(page).toHaveURL(new RegExp(`${profile.profile}/?$`));
      if (viewport.width < 768) {
        const closeSidebar = page
          .locator('[data-sidebar="sidebar"]')
          .getByRole('button', { name: 'Fechar Menu' });
        await closeSidebar.click();
        await expect(
          page.locator('[data-sidebar="sidebar"]')
        ).not.toBeVisible();
      }

      const main = page.getByRole('main');
      await expect(main.getByRole('heading', { name: 'Perfil' })).toBeVisible();
      await expect(main.getByText(/Pessoa/).first()).toBeVisible();
      if (profile.role === 'Administrador') {
        await expect(
          main.getByText(/Importar Planilha|Comunica.*InterLab/i)
        ).toHaveCount(0);
      }

      await page.route('**/api/Produtos', (route) =>
        route.fulfill({ json: [productFixture] })
      );
      await page.goto(profile.search);
      await expect(
        main.getByRole('heading', { name: profile.searchTitle })
      ).toBeVisible();
      const products = main.getByRole('list', { name: 'Produtos' });
      await expect(products).toBeVisible();
      await expect(products.getByRole('listitem')).toHaveCount(1);

      const currentSidebar = await getSidebar(page, viewport.width);
      const currentUserTrigger = currentSidebar.getByRole('button', {
        name: /Pessoa/,
      });
      await currentUserTrigger.click();
      const currentMenu = page.getByRole('menu');
      await expect(currentMenu).toBeVisible();
      await currentMenu.getByRole('menuitem', { name: 'Sair' }).click();
      await expect(page).toHaveURL(/\/$/);
      const cookieNames = (await page.context().cookies()).map(
        (cookie) => cookie.name
      );
      expect(cookieNames).not.toEqual(
        expect.arrayContaining(['doorKey', 'rankID', 'level'])
      );
    });
  }
}

for (const profile of profiles.filter(
  (candidate) => candidate.role !== 'Administrador'
)) {
  for (const viewport of viewports) {
    test(`home ${profile.name} preserva boas-vindas e busca em ${viewport.name}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, profile.role);
      await page.route('**/api/Produtos', (route) =>
        route.fulfill({ json: [productFixture] })
      );
      await page.goto(profile.home);

      const main = page.getByRole('main');
      await expect(main.getByRole('heading', { name: 'Home' })).toBeVisible();
      await expect(main.getByText(/Bem-vindo\(a\) ao Laborat/)).toBeVisible();
      await expect(main.locator('img')).toHaveCount(0);
      if (profile.role === 'Mentor') {
        await expect(main.getByRole('link', { name: /Solicita/ })).toBeVisible();
      } else {
        await expect(main.getByText(/Solicita/)).toHaveCount(0);
      }
      await expect(page.getByText(removedSurfaceText)).toHaveCount(0);

      const searchButton = main.getByRole('button');
      await expect(searchButton).toHaveCount(1);
      await openRouteSearch(page, searchButton);
      await page.getByPlaceholder('Pesquisar link').fill('Pesquisar Material');
      const searchOption = page.getByRole('option', {
        name: 'Pesquisar Material',
        exact: true,
      });
      await expect(searchOption).toBeVisible();
      await searchOption.click();
      await expect(page).toHaveURL(new RegExp(`${profile.search}/?$`));
      await expect(
        main.getByRole('heading', { name: profile.searchTitle })
      ).toBeVisible();
      await expect(main.getByRole('list', { name: 'Produtos' })).toBeVisible();
    });
  }
}

for (const viewport of viewports) {
  test(`jornada administrativa preserva cadastro, busca, conta e Settings em ${viewport.name}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    await page.route('**/api/Produtos', (route) =>
      route.fulfill({ json: [productFixture] })
    );
    await page.route('**/api/Usuarios/4242/dependentes/aprovacao', (route) =>
      route.fulfill({ json: [] })
    );

    await page.goto('/admin/');
    let main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(
      main.getByRole('link', { name: /^Produtos$/ })
    ).toHaveAttribute('href', '/admin/search-material');
    await expect(main.getByRole('link', { name: /^Usu/ })).toHaveAttribute(
      'href',
      '/admin/users'
    );
    await expect(main.locator('a[href="/admin/all-loans"]')).toBeVisible();

    await page.goto('/admin/profile');
    main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Perfil' })).toBeVisible();
    await expect(main.getByText(/Pessoa/).first()).toBeVisible();
    await expect(
      main.getByText(/Importar Planilha|Comunica.*InterLab/i)
    ).toHaveCount(0);

    await openRouteSearch(page, main.getByRole('button').first());
    await page.getByRole('option', { name: /Solicita.*Cadastro/ }).click();
    await expect(page).toHaveURL(/\/admin\/register-request$/);
    await expect(
      page.getByRole('heading', { name: /Solicita.*cadastro/i })
    ).toBeVisible();

    await page.goto('/admin/search-material');
    main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { name: /Pesquisa - Administrador/ })
    ).toBeVisible();
    await expect(main.getByRole('list', { name: 'Produtos' })).toBeVisible();

    await page.goto('/admin/insert');
    main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { name: 'Adicionar Bens' })
    ).toBeVisible();
    for (const tabName of [/Qu/, /Vidr/, /Outros/]) {
      const tab = page.getByRole('tab', { name: tabName });
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await expect(page.getByRole('tabpanel').getByLabel('Nome')).toBeVisible();
    }
    await expect(page.getByText(/Planilha|Inser.*Lotes/i)).toHaveCount(0);

    await page.goto('/admin/settings');
    main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { name: /Configura/ })
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { name: 'Alterar senha' })
    ).toBeVisible();
    await expect(main.getByText(/Adicione aqui as op/)).toHaveCount(0);
  });
}

for (const removedRoute of removedRoutes) {
  for (const session of ['visitante', 'sessao-sintetica'] as const) {
    test(`${removedRoute} exibe Page404 para ${session}, com query e após reload`, async ({
      page,
    }) => {
      const apiRequests: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.includes('/api/')) {
          apiRequests.push(request.url());
        }
      });

      for (const query of ['', '?legacy=true']) {
        await page.context().clearCookies();
        if (session === 'sessao-sintetica') {
          await mockResponsiveSession(page, 'Administrador');
        }

        await page.goto(`${removedRoute}${query}`);
        await expect(page.getByText(page404Text)).toBeVisible();
        await expect(page.getByText(removedSurfaceText)).toHaveCount(0);
        expect(apiRequests).toEqual([]);

        await page.reload();
        await expect(page.getByText(page404Text)).toBeVisible();
        await expect(page.getByText(removedSurfaceText)).toHaveCount(0);
        expect(apiRequests).toEqual([]);
      }
    });
  }
}

for (const viewport of viewports) {
  test(`superfícies públicas operacionais em ${viewport.name}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(
      page.getByRole('button', { name: 'Submeter Login' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Crie a sua agora/ })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Esqueceu sua senha/ })
    ).toBeVisible();

    await page.getByRole('link', { name: /Crie a sua agora/ }).click();
    await expect(page).toHaveURL(/\/create-account$/);
    await expect(
      page.getByRole('button', { name: 'Criar Conta' })
    ).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByLabel('Nome Completo')).toBeVisible();

    await page.goto('/');
    await page.getByRole('link', { name: /Esqueceu sua senha/ }).click();
    await expect(page).toHaveURL(/\/forgot-your-password$/);
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Enviar e-mail de recuper/ })
    ).toBeVisible();
  });
}
