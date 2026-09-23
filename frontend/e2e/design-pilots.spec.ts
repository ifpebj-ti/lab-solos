import { expect, test } from '@playwright/test';

import {
  designProductFixtures,
  designThemes,
  designViewports,
  prepareDesignPage,
  runDesignAxeAudit,
  waitForDesignReady,
} from './design-support';
import { loanCreationDependents, loanRequestFixtures } from './responsive-support';

const loanCreationProduct = {
  id: 901,
  nomeProduto: 'Reagente sintético de bancada',
  tipoProduto: 'Quimico',
  fornecedor: 'Fornecedor sintético',
  quantidade: 10,
  quantidadeMinima: 1,
  localizacaoProduto: 'Armário A',
  dataFabricacao: null,
  dataValidade: null,
  status: 'Disponivel',
};

for (const theme of designThemes) {
  test(`design pilot characterizes mentor catalog in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(designViewports[1]);
    await prepareDesignPage(page, { theme, role: 'Mentor' });
    await page.route('**/api/Produtos', (route) =>
      route.fulfill({ json: designProductFixtures })
    );
    await page.goto('/mentor/search-material');
    await waitForDesignReady(page);

    await expect(
      page.getByRole('heading', { name: /Pesquisa - Mentor/i })
    ).toBeVisible();
    const products = page.getByRole('list', { name: 'Produtos', exact: true });
    await expect(products).toBeVisible();
    await expect(products.getByRole('listitem')).toHaveCount(
      designProductFixtures.length
    );
    await expect(
      products.getByText(designProductFixtures[1].nomeProduto, { exact: true })
    ).toBeVisible();

    await runDesignAxeAudit(page, testInfo, `mentor-catalog-${theme}`);
  });

  test(`design pilot characterizes loan creation in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(designViewports[0]);
    await prepareDesignPage(page, { theme, role: 'Mentor' });
    await page.route('**/api/Produtos', (route) =>
      route.fulfill({ json: [loanCreationProduct] })
    );
    await page.route('**/api/Usuarios/4242/dependentes', (route) =>
      route.fulfill({ json: loanCreationDependents })
    );
    await page.goto('/mentor/loan/creation');
    await waitForDesignReady(page);

    await expect(
      page.getByRole('heading', { name: 'Criação de Empréstimo' })
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Usuário' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Grupo' })).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Produtos selecionados' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Solicitar Empréstimo' })
    ).toBeDisabled();

    await runDesignAxeAudit(page, testInfo, `loan-creation-${theme}`);
  });

  test(`design pilot characterizes admin loan requests in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(designViewports[1]);
    await prepareDesignPage(page, { theme, role: 'Administrador' });
    await page.route('**/api/Emprestimos', (route) =>
      route.fulfill({ json: loanRequestFixtures.slice(0, 1) })
    );
    await page.goto('/admin/loans-request');
    await waitForDesignReady(page);

    await expect(
      page.getByRole('heading', { name: /Solicita.*Empr.stimos/i })
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: /Solicita.*empr.stimo/i })
    ).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: /Pessoa/ }).first()
    ).toBeVisible();

    await runDesignAxeAudit(page, testInfo, `admin-loan-requests-${theme}`);
  });

  test(`design pilot characterizes mentee loan history in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(designViewports[0]);
    await prepareDesignPage(page, { theme, role: 'Mentorado' });
    await page.route('**/api/Emprestimos/701', (route) =>
      route.fulfill({ json: loanRequestFixtures[0] })
    );
    await page.goto('/mentee/history/loan?id=701');
    await waitForDesignReady(page);

    await expect(
      page.getByRole('heading', { name: /Hist.rico de Empr.stimo/i })
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Produtos selecionados' })
    ).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: /Produto/ }).first()
    ).toBeVisible();

    await runDesignAxeAudit(page, testInfo, `mentee-loan-history-${theme}`);
  });

  test(`design pilot characterizes mentoring history in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(designViewports[1]);
    await prepareDesignPage(page, { theme, role: 'Mentorado' });
    await page.route('**/api/Emprestimos/usuario/4242', (route) =>
      route.fulfill({ json: loanRequestFixtures.slice(0, 1) })
    );
    await page.goto('/mentee/history/mentoring');
    await waitForDesignReady(page);

    await expect(
      page.getByRole('heading', { name: /Hist.rico de Mentorados/i })
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: /Hist.rico de mentorados/i })
    ).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: '701' }).first()
    ).toBeVisible();

    await runDesignAxeAudit(page, testInfo, `mentoring-history-${theme}`);
  });

  for (const viewport of designViewports) {
    test(`design pilot characterizes login in ${theme} mode at ${viewport.width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await prepareDesignPage(page, { theme });
      await page.goto('/');
      await waitForDesignReady(page);

      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(
        page.getByRole('heading', { name: 'Entrar no LabOn' })
      ).toBeVisible();
      await expect(page.getByText('IFPE', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Senha' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Submeter Login' })
      ).toBeVisible();
      await expect(page.getByRole('link', { name: /Crie a sua agora/i })).toHaveAttribute(
        'href',
        '/create-account'
      );
      await expect(page.getByRole('link', { name: /Esqueceu sua senha/i })).toHaveAttribute(
        'href',
        '/forgot-your-password'
      );
      await expect(page.getByRole('button', { name: /Mudar para tema/i })).toBeVisible();

      await runDesignAxeAudit(page, testInfo, `login-${theme}-${viewport.width}`);
    });
  }
}
