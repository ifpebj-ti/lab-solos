import { expect, test } from '@playwright/test';

import {
  designProductFixtures,
  designThemes,
  designViewports,
  prepareDesignPage,
  runDesignAxeAudit,
  waitForDesignReady,
} from './design-support';
import {
  loanCreationDependents,
  loanRequestFixtures,
  paginatedProductResponse,
} from './responsive-support';

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

test('cadastro de químico combina digitação e seleção pelo teclado', async ({
  page,
}) => {
  await prepareDesignPage(page, { theme: 'light', role: 'Administrador' });
  const submittedProducts: unknown[] = [];
  await page.route('**/api/produtos', (route) => {
    submittedProducts.push(route.request().postDataJSON());
    return route.fulfill({ json: { id: 902 }, status: 201 });
  });
  await page.goto('/admin/insert');

  const manufacture = page.getByRole('textbox', { name: 'Data de Fabricação' });
  await expect(manufacture).toHaveAttribute('placeholder', 'dd/mm/aaaa');

  await page.getByLabel(/^Nome/).fill('Químico sintético');
  const formula = page.getByLabel(/^Fórmula Química/);
  await formula.fill('2H2O');
  await expect(formula).toHaveValue('2H2O');
  await formula.press('End');
  await formula.press('ArrowLeft');
  await formula.press('Shift+ArrowLeft');
  await page.keyboard.press('Tab');
  const applySubscript = page.getByRole('button', {
    name: 'Aplicar subscrito',
  });
  await expect(applySubscript).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(formula).toHaveValue('2H₂O');
  await expect(formula).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Remover subscrito' })
  ).toBeFocused();
  await page.keyboard.press('Space');
  await expect(formula).toHaveValue('2H2O');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(formula).toHaveValue('2H₂O');
  await page.getByLabel(/^Quantidade(?! Mínima)/).fill('12');
  await page.getByLabel(/^Quantidade Mínima/).fill('2');
  await page.getByRole('combobox', { name: /^Grupo/ }).click();
  await page.getByRole('option', { name: 'Ácido' }).click();
  await page
    .getByRole('combobox', { name: 'Selecione a unidade de medida' })
    .click();
  await page.getByRole('option', { name: 'Litro', exact: true }).click();

  await manufacture.pressSequentially('05/11/1985');

  const expiry = page.getByRole('textbox', { name: 'Data de Validade' });
  const calendar = page.getByRole('button', {
    name: 'Abrir calendário: Data de Validade',
  });
  await expiry.focus();
  await page.keyboard.press('Tab');
  await expect(calendar).toBeFocused();
  await page.keyboard.press('Enter');

  const year = page.getByRole('spinbutton', { name: 'Ano' });
  await expect(year).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('2000');
  await page.keyboard.press('Tab');
  const month = page.getByRole('combobox', { name: 'Mês' });
  await expect(month).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(month).toHaveValue('1');
  const february = page.getByRole('grid', { name: /fevereiro 2000/i });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    february.getByRole('gridcell', { name: '1', exact: true })
  ).toBeFocused();
  for (const week of [8, 15, 22, 29]) {
    await page.keyboard.press('ArrowDown');
    await expect(
      february.getByRole('gridcell', { name: String(week), exact: true })
    ).toBeFocused();
  }
  await page.keyboard.press('Enter');
  await expect(calendar).toBeFocused();
  await expect(expiry).toHaveValue('29/02/2000');

  const submit = page.getByRole('button', { name: 'Adicionar' });
  await manufacture.fill('31/02/2026');
  await submit.press('Enter');
  await expect(manufacture).toBeFocused();
  await expect(manufacture).toHaveAccessibleDescription(
    /data de fabricação inválida/i
  );
  expect(submittedProducts).toHaveLength(0);

  await manufacture.fill('05/11/1985');
  await submit.press('Enter');
  await expect(page.getByText('Produto criado', { exact: true })).toBeVisible();
  expect(submittedProducts).toEqual([
    expect.objectContaining({
      formulaQuimica: '2H₂O',
      dataFabricacao: '1985-11-05',
      dataValidade: '2000-02-29',
    }),
  ]);
});

for (const theme of designThemes) {
  test(`design pilot characterizes mentor catalog in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(designViewports[1]);
    await prepareDesignPage(page, { theme, role: 'Mentor' });
    const catalogRequests: URL[] = [];
    await page.route('**/api/Produtos**', async (route) => {
      const requestUrl = new URL(route.request().url());
      if (
        route.request().method() !== 'GET' ||
        requestUrl.pathname !== '/api/Produtos'
      ) {
        await route.continue();
        return;
      }

      catalogRequests.push(requestUrl);
      await route.fulfill({
        json: paginatedProductResponse(designProductFixtures),
      });
    });
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
    expect(catalogRequests.length).toBeGreaterThan(0);
    for (const requestUrl of catalogRequests) {
      expect(requestUrl.searchParams.get('pagina')).toBe('1');
      expect(requestUrl.searchParams.get('tamanhoPagina')).toBe('100');
    }
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
      page
        .getByRole('listitem')
        .filter({ hasText: /Pessoa/ })
        .first()
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
      page
        .getByRole('listitem')
        .filter({ hasText: /Produto/ })
        .first()
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
      await expect(
        page.getByRole('link', { name: /Crie a sua agora/i })
      ).toHaveAttribute('href', '/create-account');
      await expect(
        page.getByRole('link', { name: /Esqueceu sua senha/i })
      ).toHaveAttribute('href', '/forgot-your-password');
      await expect(
        page.getByRole('button', { name: /Mudar para tema/i })
      ).toBeVisible();

      await runDesignAxeAudit(
        page,
        testInfo,
        `login-${theme}-${viewport.width}`
      );
    });
  }
}
