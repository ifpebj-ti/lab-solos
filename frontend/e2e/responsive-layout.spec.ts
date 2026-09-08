import { expect, test } from '@playwright/test';
import {
  expectPageFits,
  mockResponsiveSession,
  productFixtures,
  responsiveViewports,
  fillResponsiveAccount,
  expectAccountFits,
  registrationRequestFixtures,
  loanRequestFixtures,
  registeredUserFixtures,
  loanCreationDependents,
  returnLoanFixtures,
  loanHistoryAdminFixture,
  loanHistoryMenteeFixture,
  verificationProductFixture,
  verificationHistoryFixture,
  loanHistoriesFixtures,
  alertFixtures,
  classFixture,
  classDependentsFixtures,
  adminLoansFixtures,
  classLoansFixtures,
  mentoringLoansFixtures,
  mentorDependentsFixtures,
  mentorHistoryFixtures,
  mentorMentoringHistoryFixtures,
  menteeMentoringHistoryFixtures,
} from './responsive-support';

for (const viewport of responsiveViewports) {
  test(`T006 criação de empréstimo ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Mentor');
    const products = [
      { ...productFixtures[0], tipoProduto: 'Vidraria' },
      { ...productFixtures[1], id: 102, tipoProduto: 'Quimico' },
    ];
    const submissions: Array<Record<string, unknown>> = [];
    await page.route('**/api/Produtos', (route) =>
      route.fulfill({ json: products })
    );
    await page.route('**/api/Usuarios/4242/dependentes', (route) =>
      route.fulfill({ json: loanCreationDependents })
    );
    await page.route('**/api/Emprestimos', (route) => {
      submissions.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: {} });
    });

    await page.goto('/mentor/loan/creation');
    await expect(page.getByText('Pessoa dependente sintética')).toHaveCount(0);

    const choose = async (index: number, option: string | RegExp) => {
      await page.getByRole('combobox').nth(index).click();
      await page
        .getByRole('option', {
          name: option,
          exact: typeof option === 'string',
        })
        .click();
    };
    await choose(0, 'Pessoa dependente sintética');
    await choose(1, 'Vidraria');
    await choose(2, new RegExp(`^A{200}$`));
    await page.getByLabel('Quantidade').fill('2');
    await choose(3, 'Litro');
    await page.getByRole('button', { name: 'Adicionar' }).click();

    await choose(1, 'Químico');
    await choose(2, /Nome longo com espaços/);
    await page.getByLabel('Quantidade').fill('3');
    await choose(3, 'Litro');
    await page.getByRole('button', { name: 'Adicionar' }).click();

    const list = page.getByRole('list', { name: 'Produtos selecionados' });
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expectPageFits(page, 'Produtos selecionados');
    const first = list.getByRole('listitem').first();
    const labels = first.locator('dt');
    if (viewport.width < 768) {
      expect((await labels.first().boundingBox())!.width).toBeGreaterThan(1);
    } else {
      expect((await labels.first().boundingBox())!.width).toBe(1);
      const header = list.locator('[aria-hidden="true"] > p');
      const cells = first.locator('dd');
      for (let index = 0; index < 4; index++)
        expect(
          Math.abs(
            (await header.nth(index).boundingBox())!.x -
              (await cells.nth(index).boundingBox())!.x
          )
        ).toBeLessThanOrEqual(1);
    }

    const remove = page.getByRole('button', {
      name: /Remover Nome longo com espaços/,
    });
    if (viewport.width < 768) {
      const bounds = (await remove.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await remove.focus();
    await page.keyboard.press(viewport.width === 320 ? 'Enter' : 'Space');
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(first).toContainText('A'.repeat(200));
    expect(submissions).toHaveLength(0);
    await expectPageFits(page, 'Produtos selecionados');

    if (viewport.width === 375) {
      const remainingRemove = page.getByRole('button', {
        name: new RegExp(`Remover A{200}`),
      });
      await remainingRemove.focus();
      for (const size of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await expect(list.getByRole('listitem')).toHaveCount(1);
        await expect(remainingRemove).toBeFocused();
        await expectPageFits(page, 'Produtos selecionados');
      }
      expect(submissions).toHaveLength(0);
    }

    if ([320, 1440].includes(viewport.width))
      await page.screenshot({
        path: testInfo.outputPath(`criacao-emprestimo-${viewport.width}.png`),
        fullPage: true,
      });
  });
}

for (const [profile, role] of [
  ['admin', 'Administrador'],
  ['mentor', 'Mentor'],
  ['mentee', 'Mentorado'],
] as const) {
  for (const viewport of responsiveViewports) {
    test(`T009 verification ${profile} ${viewport.width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, role);
      await page.route('**/api/Produtos', (route) =>
        route.fulfill({ json: [productFixtures[0]] })
      );
      await page.route('**/api/Produtos/101/historico-saida', (route) =>
        route.fulfill({ json: verificationHistoryFixture })
      );
      await page.route('**/api/Produtos/101', (route) =>
        route.fulfill({ json: verificationProductFixture })
      );

      await page.goto(`/${profile}/search-material`);
      await page.getByRole('list', { name: 'Produtos' }).getByRole('link').first().click();
      const info = page.getByRole('list', { name: /Informa/ });
      await expect(info).toBeVisible();
      await expect(info.getByRole('listitem')).toContainText(
        verificationProductFixture.nomeProduto
      );
      await expect(info.getByRole('listitem')).toContainText('H2O');
      await expectPageFits(page, 'InformaÃ§Ãµes do Produto');

      const labels = info.getByRole('listitem').locator('dt');
      if (viewport.width < 768)
        expect((await labels.first().boundingBox())!.width).toBeGreaterThan(1);
      else {
        expect((await labels.first().boundingBox())!.width).toBe(1);
        const header = info.locator('[aria-hidden="true"] > p');
        const cells = info.getByRole('listitem').locator('dd');
        for (let index = 0; index < await header.count(); index++)
          expect(
            Math.abs(
              (await header.nth(index).boundingBox())!.x -
                (await cells.nth(index).boundingBox())!.x
            )
          ).toBeLessThanOrEqual(1);
      }

      if (profile === 'admin') {
        const history = page.getByRole('list', {
          name: /Hist.*Movimenta/,
        });
        await expect(history).toBeVisible();
        await expect(history.getByRole('listitem')).toHaveCount(2);
        await expect(history.getByRole('listitem').first()).toContainText('ID-2001');
        await expect(history.getByRole('listitem').first()).toContainText('N/A');
        await expectPageFits(page, /Hist.*Movimenta/);
        const search = page.getByRole('textbox', { name: 'Pesquisar' });
        await search.fill('Outra pessoa');
        await expect(history.getByRole('listitem')).toHaveCount(1);
        await expect(history.getByRole('listitem')).toContainText('ID-2002');
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(search).toHaveValue('Outra pessoa');
        await expect(search).toBeFocused();
        await expectPageFits(page, /Hist.*Movimenta/);
      }

      if ([320, 1440].includes(viewport.width))
        await page.screenshot({
          path: testInfo.outputPath(`verificacao-${profile}-${viewport.width}.png`),
          fullPage: true,
        });
    });
  }
}

for (const viewport of responsiveViewports) {
  test(`T009 loan histories ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Mentor');
    await page.route('**/api/Usuarios/4242/dependentes/emprestimos', (route) =>
      route.fulfill({ json: loanHistoriesFixtures })
    );
    await page.goto('/mentor/loan/histories');

    const list = page.getByRole('list', { name: /Hist.*Empr/ });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(7);
    await expect(list.getByRole('listitem').first()).toContainText('Pessoa ' + 'B'.repeat(200));
    await expectPageFits(page, /Hist.*Empr/);

    const labels = list.getByRole('listitem').first().locator('dt');
    if (viewport.width < 768)
      expect((await labels.first().boundingBox())!.width).toBeGreaterThan(1);
    else {
      expect((await labels.first().boundingBox())!.width).toBe(1);
      const header = list.locator('[aria-hidden="true"] > p');
      const cells = list.getByRole('listitem').first().locator('dd');
      for (let index = 0; index < 5; index++)
        expect(
          Math.abs(
            (await header.nth(index).boundingBox())!.x -
              (await cells.nth(index).boundingBox())!.x
          )
        ).toBeLessThanOrEqual(1);
    }

    const search = page.getByRole('textbox', { name: 'Pesquisar' });
    await search.fill('Pessoa 8');
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list.getByRole('listitem')).toContainText('1308');
    await expectPageFits(page, /Hist.*Empr/);
    await search.fill('inexistente');
    await expect(page.getByText(/Nenhum dado.*exibi/)).toBeVisible();
    await expectPageFits(page, /Hist.*Empr/);

    if ([320, 1440].includes(viewport.width))
      await page.screenshot({
        path: testInfo.outputPath(`historico-geral-${viewport.width}.png`),
        fullPage: true,
      });
  });
}

for (const viewport of responsiveViewports) {
  test(`T010 acompanhamento ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    await page.route('**/api/Produtos/emAlerta', (route) =>
      route.fulfill({ json: alertFixtures })
    );
    await page.goto('/admin/follow-up');
    const list = page.getByRole('list', { name: 'Produtos em alerta' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list.getByRole('listitem')).toContainText('Alerta ' + 'A'.repeat(200));
    await expect(list.getByRole('link')).toHaveAttribute('href', '/admin/verification');
    await expectPageFits(page, 'Produtos em alerta');
    if ([320, 1440].includes(viewport.width))
      await page.screenshot({ path: testInfo.outputPath(`acompanhamento-${viewport.width}.png`), fullPage: true });
  });
}

for (const [pagePath, listName, destination, title] of [
  ['/admin/view-class', 'Usuários da turma', '/admin/view-class-mentor', 'T010 visualização de turma'],
  ['/admin/view-class-mentor', 'Mentorados da turma', '/admin/history/mentoring', 'T010 visualização de mentorados'],
] as const) {
  for (const viewport of responsiveViewports) {
    test(`${title} ${viewport.width}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, 'Administrador');
      await page.route('**/api/Usuarios/**', (route) => {
        const url = route.request().url();
        if (url.includes('/dependentes'))
          return route.fulfill({ json: classDependentsFixtures });
        return route.fulfill({ json: classFixture });
      });
      await page.goto(pagePath);
      const list = page.getByRole('list', { name: listName });
      await expect(list).toBeVisible();
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await expect(list.getByRole('listitem')).toContainText('Mentorado');
      await expect(list.getByRole('link')).toHaveAttribute('href', destination);
      await expectPageFits(page, listName);
      if ([320, 1440].includes(viewport.width))
        await page.screenshot({ path: testInfo.outputPath(`${listName}-${viewport.width}.png`), fullPage: true });
    });
  }
}

for (const viewport of responsiveViewports) {
  test(`T011 todos os empréstimos ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    await page.route('**/api/Emprestimos', (route) => route.fulfill({ json: adminLoansFixtures }));
    await page.goto('/admin/all-loans');
    const list = page.getByRole('list', { name: 'Todos os empréstimos' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list.getByRole('listitem')).toContainText('Solicitante');
    await expectPageFits(page, 'Todos os empréstimos');
    if ([320, 1440].includes(viewport.width)) await page.screenshot({ path: testInfo.outputPath(`todos-emprestimos-${viewport.width}.png`), fullPage: true });
  });
}

for (const [path, listName, fixture, title] of [
  ['/admin/view-history-class-by-id', 'Histórico de empréstimos da turma', classLoansFixtures, 'T011 empréstimos da turma'],
  ['/admin/history/mentoring', 'Histórico de mentorados', mentoringLoansFixtures, 'T011 histórico de mentorados'],
] as const) {
  for (const viewport of responsiveViewports) {
    test(`${title} ${viewport.width}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, 'Administrador');
      await page.route('**/api/Usuarios/**', (route) => route.fulfill({ json: classFixture }));
      if (path.includes('view-history')) {
        await page.route('**/api/Usuarios/**/dependentes/emprestimos', (route) => route.fulfill({ json: fixture }));
      } else {
        await page.route('**/api/Emprestimos/usuario/**', (route) => route.fulfill({ json: fixture }));
      }
      await page.goto(path);
      const list = page.getByRole('list', { name: listName });
      await expect(list).toBeVisible();
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await expectPageFits(page, listName);
      if ([320, 1440].includes(viewport.width)) await page.screenshot({ path: testInfo.outputPath(`${title}-${viewport.width}.png`), fullPage: true });
    });
  }
}

for (const [path, listName, destination, title] of [
  ['/mentor/my-class', 'Minha turma', '/mentor/history/mentoring', 'T012 minha turma'],
  ['/mentor/my-class/disabled', 'Mentorados desativados', '/mentor/history/mentoring', 'T012 desativados'],
] as const) {
  for (const viewport of responsiveViewports) {
    test(`${title} ${viewport.width}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, 'Mentor');
      await page.route('**/api/Usuarios/4242/dependentes', (route) => route.fulfill({ json: mentorDependentsFixtures }));
      await page.goto(path);
      const list = page.getByRole('list', { name: listName });
      await expect(list).toBeVisible();
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await expect(list.getByRole('listitem')).toContainText('Mentorado');
      await expect(list.getByRole('link')).toHaveAttribute('href', destination);
      await expectPageFits(page, listName);
      if ([320, 1440].includes(viewport.width)) await page.screenshot({ path: testInfo.outputPath(`${title}-${viewport.width}.png`), fullPage: true });
    });
  }
}

for (const viewport of responsiveViewports) {
  test(`T012 histórico da turma ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Mentor');
    await page.route('**/api/Usuarios/4242/dependentes/emprestimos', (route) => route.fulfill({ json: mentorHistoryFixtures }));
    await page.goto('/mentor/history/class');
    const list = page.getByRole('list', { name: 'Histórico da turma' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list.getByRole('link')).toHaveAttribute('href', '/mentor/history/loan');
    await expectPageFits(page, 'Histórico da turma');
    if ([320, 1440].includes(viewport.width)) await page.screenshot({ path: testInfo.outputPath(`historico-turma-${viewport.width}.png`), fullPage: true });
  });
}

for (const viewport of responsiveViewports) {
  test(`T013 histórico de mentorados mentor ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Mentor');
    await page.route('**/api/Usuarios/4242/dependentes', (route) =>
      route.fulfill({ json: mentorDependentsFixtures })
    );
    await page.route('**/api/Usuarios/4101', (route) =>
      route.fulfill({ json: mentorDependentsFixtures[0] })
    );
    await page.route('**/api/Emprestimos/usuario/4101', (route) =>
      route.fulfill({ json: mentorMentoringHistoryFixtures })
    );
    await page.goto('/mentor/my-class');
    await page.getByRole('list', { name: 'Minha turma' }).getByRole('link').click();
    const list = page.getByRole('list', { name: 'Histórico de mentorados' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list).toContainText('4501');
    await expectPageFits(page, 'Histórico de mentorados');
    if ([320, 1440].includes(viewport.width))
      await page.screenshot({ path: testInfo.outputPath(`historico-mentor-${viewport.width}.png`), fullPage: true });
  });

  test(`T013 histórico de mentorados mentorado ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Mentorado');
    await page.route('**/api/Emprestimos/usuario/4242', (route) =>
      route.fulfill({ json: menteeMentoringHistoryFixtures })
    );
    await page.goto('/mentee/history/mentoring');
    const list = page.getByRole('list', { name: 'Histórico de mentorados' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list).toContainText('4601');
    await expectPageFits(page, 'Histórico de mentorados');
    if ([320, 1440].includes(viewport.width))
      await page.screenshot({ path: testInfo.outputPath(`historico-mentorado-${viewport.width}.png`), fullPage: true });
  });
}

for (const viewport of responsiveViewports) {
  test(`T014 pedidos e ofertas ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    await page.goto('/admin/view-info');
    await page.locator('div.fixed.inset-0').evaluate((element) => element.remove());
    const list = page.getByRole('list', { name: 'Pedidos e ofertas' });
    await expect(list).toBeVisible();
    const records = list.getByRole('listitem');
    await expect(records).not.toHaveCount(0);
    const first = records.first();
    await expect(first.locator('dt')).toHaveCount(8);
    await expect(first).toContainText('Oferta');
    await expectPageFits(page, 'Pedidos e ofertas');
    await first.click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Contato com o Laboratório');
    await expect(dialog.getByText(/produto/i)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    if ([320, 1440].includes(viewport.width))
      await page.screenshot({ path: testInfo.outputPath(`pedidos-ofertas-${viewport.width}.png`), fullPage: true });
  });
}

for (const viewport of responsiveViewports) {
  test(`T015 primitivas responsivas ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    await page.route('**/api/Usuarios/4242/dependentes/aprovacao', (route) =>
      route.fulfill({ json: registrationRequestFixtures })
    );
    await page.goto('/admin/register-request');
    const list = page.getByRole('list', { name: 'Solicitações de cadastro' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(7);
    await expectPageFits(page, 'Solicitações de cadastro');
  });
}

for (const [profile, role, fixture, heading] of [
  ['admin', 'Administrador', loanHistoryAdminFixture, /Histórico de Empréstimo/],
  ['mentor', 'Mentor', loanHistoryAdminFixture, /Histórico de Empréstimo/],
  ['mentee', 'Mentorado', loanHistoryMenteeFixture, /Histórico de Empréstimo/],
] as const) {
  for (const viewport of responsiveViewports) {
    test(`T008 histórico detalhado ${profile} ${viewport.width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, role);
      await page.route('**/api/Emprestimos/*', (route) =>
        route.fulfill({ json: fixture })
      );

      await page.goto(`/${profile}/history/loan`);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      const linked = page.getByRole('list', { name: 'Mentorado vinculado' });
      const products = page.getByRole('list', { name: 'Produtos selecionados' });
      await expect(linked).toBeVisible();
      await expect(products).toBeVisible();
      await expectPageFits(page, 'Produtos selecionados');
      await expect(linked.getByRole('listitem')).toHaveCount(1);
      await expect(products.getByRole('listitem')).toHaveCount(
        profile === 'mentee' ? 1 : 2
      );
      await expect(products.getByRole('listitem').first()).toContainText(
        profile === 'mentee'
          ? 'Reagente histórico ' + 'B'.repeat(200)
          : 'Produto histórico ' + 'A'.repeat(200)
      );
      await expect(products).not.toContainText('undefined');

      const first = products.getByRole('listitem').first();
      const labels = first.locator('dt');
      if (viewport.width < 768)
        expect((await labels.first().boundingBox())!.width).toBeGreaterThan(1);
      else {
        expect((await labels.first().boundingBox())!.width).toBe(1);
        const header = products.locator('[aria-hidden="true"] > p');
        const cells = first.locator('dd');
        for (let index = 0; index < 5; index++)
          expect(
            Math.abs(
              (await header.nth(index).boundingBox())!.x -
                (await cells.nth(index).boundingBox())!.x
            )
          ).toBeLessThanOrEqual(1);
      }

      if (profile !== 'mentee') {
        await page.getByRole('button', { name: 'Exportar empréstimo' }).click();
        await expect(page.getByText('Excel', { exact: true })).toBeVisible();
        await expect(page.getByText('PDF', { exact: true })).toBeVisible();
      } else {
        await expect(
          page.getByRole('button', { name: 'Exportar empréstimo' })
        ).toHaveCount(0);
      }

      if (viewport.width < 768 && profile !== 'mentee') {
        const exportButton = page.getByRole('button', {
          name: 'Exportar empréstimo',
        });
        const bounds = (await exportButton.boundingBox())!;
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
      }

      if (viewport.width === 375) {
        const search = page.getByRole('textbox', { name: 'Pesquisar' });
        await search.fill('Produto');
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(search).toHaveValue('Produto');
        await expect(search).toBeFocused();
        await expectPageFits(page, 'Produtos selecionados');
      }

      if ([320, 1440].includes(viewport.width))
        await page.screenshot({
          path: testInfo.outputPath(`historico-detalhado-${profile}-${viewport.width}.png`),
          fullPage: true,
        });
    });
  }
}

for (const viewport of responsiveViewports) {
  test(`T007 devolução de empréstimo ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    await page.route('**/api/Emprestimos/*', (route) =>
      route.fulfill({ json: returnLoanFixtures })
    );

    await page.goto('/admin/return');
    await expect(page.getByRole('heading', { name: 'Devolução de Empréstimo' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Registrar Devolução' })
    ).toHaveAttribute('type', 'button');

    for (const listName of ['Químicos', 'Vidrarias', 'Outros']) {
      await expect(page.getByRole('list', { name: listName })).toBeVisible();
      await expectPageFits(page, listName);
    }

    const chemicals = page.getByRole('list', { name: 'Químicos' });
    const glassware = page.getByRole('list', { name: 'Vidrarias' });
    const others = page.getByRole('list', { name: 'Outros' });
    await expect(chemicals.getByRole('listitem')).toContainText('Ácido cítrico');
    await expect(chemicals.getByRole('listitem')).toContainText('Não corresponde');
    await expect(chemicals.getByRole('listitem').locator('input,button')).toHaveCount(0);
    await expect(glassware.getByRole('listitem')).toHaveCount(2);
    await expect(others.getByRole('listitem')).toHaveCount(1);
    await expect(glassware.getByRole('listitem').first()).toContainText('A'.repeat(200));

    const firstSwitch = page.getByLabel('Devolução Vidraria ' + 'A'.repeat(200));
    const firstReason = page.getByLabel('Justificativa Vidraria ' + 'A'.repeat(200));
    const secondSwitch = page.getByLabel('Devolução Proveta sintética');
    await expect(firstSwitch).toBeChecked();
    await expect(firstReason).toBeDisabled();
    await expect(secondSwitch).toBeChecked();
    await firstSwitch.click();
    await expect(firstReason).toBeEnabled();
    await firstReason.fill('Quebrou durante o uso');
    await expect(secondSwitch).toBeChecked();
    await expect(page).toHaveURL(/\/admin\/return$/);

    if (viewport.width === 375) {
      await firstReason.focus();
      for (const size of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await expect(firstReason).toHaveValue('Quebrou durante o uso');
        await expect(firstReason).toBeFocused();
        await expectPageFits(page, 'Vidrarias');
      }
    }

    if ([320, 1440].includes(viewport.width))
      await page.screenshot({
        path: testInfo.outputPath(`devolucao-${viewport.width}.png`),
        fullPage: true,
      });
  });
}

for (const viewport of [...responsiveViewports, { width: 812, height: 375 }]) {
  test(`T002 cadastro ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const submissions: Record<string, unknown>[] = [];
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const longError =
      'Cidade inválida ' +
      'A'.repeat(200) +
      ' Informe uma cidade válida para concluir seu cadastro.';
    await page.route('**/api/Usuarios', async (route) => {
      submissions.push(route.request().postDataJSON());
      if (submissions.length === 1) {
        await pending;
        await route.fulfill({
          status: 400,
          json: {
            errors: {
              cidade: [longError],
              curso: ['Curso rejeitado pelo servidor.'],
            },
          },
        });
      } else await route.fulfill({ status: 201, json: {} });
    });
    await page.goto('/create-account');
    await expect(page.getByLabel('Nome Completo')).toBeVisible();
    await expectAccountFits(page);
    await fillResponsiveAccount(page);
    const password = page.getByLabel('Senha', { exact: true });
    await password.focus();
    await page.keyboard.press('Tab');
    const show = page.getByRole('button', {
      name: 'Mostrar Senha',
      exact: true,
    });
    await expect(show).toBeFocused();
    await page.keyboard.press('Space');
    await expect(password).toHaveAttribute('type', 'text');
    await page.keyboard.press('Enter');
    await expect(password).toHaveAttribute('type', 'password');
    await page.keyboard.press('Shift+Tab');
    await expect(password).toBeFocused();
    expect(
      await password.evaluate((e) => getComputedStyle(e).outlineStyle)
    ).not.toBe('none');
    const checkbox = page.getByRole('checkbox', { name: 'Aceito os' });
    await checkbox.focus();
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();
    const terms = page.getByRole('button', { name: 'termos e condições' });
    await terms.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', {
      name: 'TERMOS E CONDIÇÕES DE USO',
    });
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      );
    });
    await expectPageFits(page);
    expect(await dialog.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(
      true
    );
    if ([320, 1440].includes(viewport.width)) {
      await page.screenshot({
        path: testInfo.outputPath(`termos-${viewport.width}.png`),
      });
    }
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(dialog).not.toBeVisible();
    await expect(terms).toBeFocused();
    expect(submissions).toHaveLength(0);
    if ([320, 1440].includes(viewport.width)) {
      await page.screenshot({
        path: testInfo.outputPath(`cadastro-${viewport.width}.png`),
        fullPage: true,
      });
    }
    if (viewport.width < 768) {
      for (const control of await page
        .locator(
          'form input:not([type="hidden"]):not([aria-hidden="true"]), form button:not([role="checkbox"]), main [role="combobox"]'
        )
        .all()) {
        const box = (await control.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        (await page.locator('label[for="terms"]').boundingBox())!.height
      ).toBeGreaterThanOrEqual(44);
    }
    await page.getByLabel('Cidade').fill('indefinido');
    await page.getByRole('button', { name: 'Criar Conta' }).click();
    await expect(
      page.getByText('Informe uma cidade válida.', { exact: true })
    ).toBeVisible();
    expect(submissions).toHaveLength(0);
    await page.getByLabel('Cidade').fill('  Belo Jardim  ');
    await page.getByRole('button', { name: 'Criar Conta' }).click();
    await expect.poll(() => submissions.length).toBe(1);
    await expectAccountFits(page);
    release();
    const safeError = 'Verifique este campo.';
    const cityError = page.locator('#cidade-error');
    await expect(cityError).toHaveText(safeError);
    await expect(page.getByLabel('Cidade')).toHaveAccessibleDescription(
      safeError
    );
    await expectAccountFits(page);
    const errorBox = (await page
      .locator('#cidade-error')
      .boundingBox())!;
    const nextBox = (await page
      .getByLabel('Email do Mentor Responsável')
      .boundingBox())!;
    expect(errorBox.y + errorBox.height).toBeLessThan(nextBox.y);
    const city = page.getByLabel('Cidade');
    await city.fill('Recife');
    for (const size of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      await expectAccountFits(page);
      await expect(city).toBeFocused();
      await expect(city).toHaveValue('Recife');
      await expect(checkbox).toBeChecked();
    }
    expect(submissions).toHaveLength(1);
    await page.getByRole('button', { name: 'Criar Conta' }).click();
    await expect(page).toHaveURL('/');
    expect(submissions).toHaveLength(2);
    expect(submissions[0]).toMatchObject({
      cidade: 'Belo Jardim',
      curso: 'ES',
      nivelUsuario: 'Mentor',
      tipoUsuario: 'Academico',
      responsavelEmail: 'mentor@example.invalid',
    });
    expect(submissions[1]).toMatchObject({ cidade: 'Recife', curso: 'ES' });
  });
}

for (const [profile, role] of [
  ['admin', 'Administrador'],
  ['mentor', 'Mentor'],
  ['mentee', 'Mentorado'],
]) {
  for (const viewport of responsiveViewports) {
    test(`T001 produtos ${profile} ${viewport.width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, role);
      let queries = 0;
      let quantityQueries = 0;
      page.on('request', (request) => {
        if (request.url().endsWith('/System/quantities')) quantityQueries++;
      });
      await page.route('**/api/Produtos', (route) => {
        queries++;
        return route.fulfill({ json: productFixtures });
      });
      await page.goto(`/${profile}/search-material`);
      await expect(
        page.getByText('A'.repeat(200), { exact: true })
      ).toBeVisible();
      const list = page.getByRole('list', { name: 'Produtos' });
      await expect(list).toBeVisible();
      await expect(list.getByRole('listitem')).toHaveCount(7);
      await expectPageFits(page);
      if (profile === 'admin' && [320, 1440].includes(viewport.width)) {
        await list.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath(`produtos-${viewport.width}.png`),
        });
      }
      const cells = list.getByRole('listitem').first().locator('dd');
      if (viewport.width >= 768) {
        const header = list.locator('[aria-hidden="true"] > p');
        for (let index = 0; index < 6; index++) {
          expect(
            Math.abs(
              (await cells.nth(index).boundingBox())!.x -
                (await header.nth(index).boundingBox())!.x
            )
          ).toBeLessThanOrEqual(1);
        }
      } else {
        for (const button of await page
          .getByRole('navigation', { name: 'Paginação' })
          .getByRole('button')
          .all()) {
          const bounds = await button.boundingBox();
          expect(bounds!.width).toBeGreaterThanOrEqual(44);
          expect(bounds!.height).toBeGreaterThanOrEqual(44);
        }
        const bounds = await page
          .getByRole('button', { name: 'Inverter ordem' })
          .boundingBox();
        expect(bounds!.width).toBeGreaterThanOrEqual(44);
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
      }
      const label = list.getByRole('listitem').first().locator('dt').first();
      if (viewport.width < 768)
        expect((await label.boundingBox())!.width).toBeGreaterThan(1);
      else expect((await label.boundingBox())!.width).toBe(1);
      await page.getByRole('button', { name: 'Página 2', exact: true }).click();
      await expect(list).toContainText('Produto 8');
      await expectPageFits(page);
      await page.getByRole('button', { name: 'Primeira página' }).click();
      await page.getByRole('button', { name: 'Inverter ordem' }).focus();
      await page.keyboard.press('Space');
      await expect(list.getByRole('listitem').first()).toContainText(
        'Produto 42'
      );
      await page.keyboard.press('Enter');
      await expect(list.getByRole('listitem').first()).toContainText('101');
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('textbox', { name: 'Pesquisar' })
      ).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(
        page.getByRole('button', { name: 'Inverter ordem' })
      ).toBeFocused();
      expect(
        await page
          .getByRole('button', { name: 'Inverter ordem' })
          .evaluate((element) => getComputedStyle(element).outlineStyle)
      ).not.toBe('none');
      await page.getByRole('combobox').click();
      await expect(
        page.getByRole('option', { name: 'Vidrarias', exact: true })
      ).toBeVisible();
      await expectPageFits(page);
      await page
        .getByRole('option', { name: 'Vidrarias', exact: true })
        .click();
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: 'Todos', exact: true }).click();
      await page.getByRole('textbox', { name: 'Pesquisar' }).fill('Produto 3');
      await page.setViewportSize({ width: 375, height: 812 });
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(
        page.getByRole('textbox', { name: 'Pesquisar' })
      ).toHaveValue('Produto 3');
      await expect(
        page.getByRole('textbox', { name: 'Pesquisar' })
      ).toBeFocused();
      await expectPageFits(page);
      expect(queries).toBe(1);
      expect(quantityQueries).toBe(1);
      const link = list.getByRole('link').first();
      await link.focus();
      await expect(link).toBeFocused();
      await link.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/${profile}/verification`));
      expect(await page.evaluate(() => history.state.usr.id)).toBe(103);
    });
  }
}

for (const viewport of responsiveViewports) {
  for (const state of ['vazio', 'erro', 'atraso']) {
    test(`T001 produtos ${state} ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockResponsiveSession(page, 'Administrador');
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/Produtos', async (route) => {
        if (state === 'atraso') await pending;
        await route.fulfill({
          status: state === 'erro' ? 500 : 200,
          json: state === 'atraso' ? productFixtures : [],
        });
      });
      await page.goto('/admin/search-material');
      if (state === 'atraso') {
        await expect(
          page.getByRole('status').filter({ hasText: 'Carregando...' })
        ).toBeVisible();
        await expectPageFits(page);
        release();
        await expect(
          page.getByRole('list', { name: 'Produtos' })
        ).toBeVisible();
      } else {
        await expect(
          page.getByText('Nenhum dado disponível para exibição.')
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Última página' })
        ).toBeDisabled();
      }
      await expectPageFits(page);
    });
  }
}

for (const viewport of responsiveViewports) {
  test(`T005 usuarios cadastrados ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    let listQueries = 0;
    const statusUpdates: Array<{ id: number; status: string }> = [];
    await page.route('**/api/Usuarios', (route) => {
      listQueries++;
      return route.fulfill({ json: registeredUserFixtures });
    });
    await page.route('**/api/Usuarios/801', async (route) => {
      if (route.request().method() === 'PATCH') {
        const patch = route.request().postDataJSON() as Array<{
          value: string;
        }>;
        statusUpdates.push({ id: 801, status: patch[0].value });
        return route.fulfill({ json: {} });
      }
      return route.fallback();
    });

    await page.goto('/admin/users');
    const list = page.getByRole('list', { name: 'Usuários cadastrados' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(7);
    const first = list.getByRole('listitem').first();
    await expect(first).toContainText('A'.repeat(200));
    await expectPageFits(page, 'Usuários cadastrados');

    const labels = first.locator('dt');
    if (viewport.width < 768) {
      expect((await labels.first().boundingBox())!.width).toBeGreaterThan(1);
    } else {
      expect((await labels.first().boundingBox())!.width).toBe(1);
      const header = list.locator('[aria-hidden="true"] > p');
      const cells = first.locator('dd');
      for (let index = 0; index < 4; index++)
        expect(
          Math.abs(
            (await header.nth(index).boundingBox())!.x -
              (await cells.nth(index).boundingBox())!.x
          )
        ).toBeLessThanOrEqual(1);
    }

    const primary = first.getByRole('link', {
      name: new RegExp(`Abrir Pessoa A{200}`),
    });
    await primary.focus();
    await expect(primary).toBeFocused();
    if (viewport.width < 768) {
      const bounds = (await primary.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }

    if (viewport.width === 375) {
      const status = first.getByRole('combobox');
      await status.click();
      await page.getByRole('option', { name: 'Habilitado', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/users$/);
      const dialog = page.getByRole('alertdialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Habilitar' }).click();
      await expect.poll(() => statusUpdates).toEqual([
        { id: 801, status: 'Habilitado' },
      ]);
      await expect(dialog).not.toBeVisible();
      await status.focus();
      for (const size of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await expect(status).toContainText('Habilitado');
        await expect(status).toBeFocused();
        await expectPageFits(page, 'Usuários cadastrados');
      }
      expect(listQueries).toBe(1);
    }

    const secondPage = page.getByRole('button', {
      name: 'Página 2',
      exact: true,
    });
    await secondPage.focus();
    await expect(secondPage).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(list).toContainText('Pessoa cadastrada 8');
    await expectPageFits(page, 'Usuários cadastrados');
    if ([320, 1440].includes(viewport.width))
      await page.screenshot({
        path: testInfo.outputPath(`usuarios-${viewport.width}.png`),
        fullPage: true,
      });
  });
}

for (const viewport of responsiveViewports) {
  test(`T004 solicitacoes de emprestimo ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    const actions: Array<{ kind: 'approve' | 'reject'; id: number }> = [];
    let listQueries = 0;
    await page.route('**/api/Emprestimos', (route) => {
      listQueries++;
      return route.fulfill({ json: loanRequestFixtures });
    });
    await page.route('**/api/Emprestimos/aprovar/*', (route) => {
      actions.push({
        kind: 'approve',
        id: Number(route.request().url().match(/aprovar\/(\d+)/)?.[1]),
      });
      return route.fulfill({ json: {} });
    });
    await page.route('**/api/Emprestimos/reprovar/*', (route) => {
      actions.push({
        kind: 'reject',
        id: Number(route.request().url().match(/reprovar\/(\d+)/)?.[1]),
      });
      return route.fulfill({ json: {} });
    });

    await page.goto('/admin/loans-request');
    const list = page.getByRole('list', {
      name: 'Solicitações de empréstimo',
    });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(7);
    await expectPageFits(page, 'Solicitações de empréstimo');

    const first = list.getByRole('listitem').first();
    await expect(first).toContainText('A'.repeat(200));
    await expect(list.getByRole('listitem').nth(1)).toContainText(
      'Não corresponde'
    );
    const labels = first.locator('dt');
    if (viewport.width < 768) {
      expect((await labels.first().boundingBox())!.width).toBeGreaterThan(1);
    } else {
      expect((await labels.first().boundingBox())!.width).toBe(1);
      const header = list.locator('[aria-hidden="true"] > p');
      const cells = first.locator('dd');
      for (let index = 0; index < 4; index++)
        expect(
          Math.abs(
            (await header.nth(index).boundingBox())!.x -
              (await cells.nth(index).boundingBox())!.x
          )
        ).toBeLessThanOrEqual(1);
    }

    const reject = page.getByRole('button', {
      name: new RegExp(`Recusar Pessoa A{200}`),
    });
    if (viewport.width < 768) {
      const bounds = (await reject.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await reject.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => actions).toContainEqual({ kind: 'reject', id: 701 });
    await expect(page).toHaveURL(/\/admin\/loans-request$/);
    expect(await page.evaluate(() => history.state.usr)).toBeUndefined();

    const approve = page.getByRole('button', {
      name: new RegExp(`Aprovar Pessoa A{200}`),
    });
    await approve.focus();
    await page.keyboard.press('Space');
    await expect.poll(() => actions).toContainEqual({ kind: 'approve', id: 701 });
    expect(actions).toHaveLength(2);
    await expect.poll(() => listQueries).toBe(3);
    await expect(page).toHaveURL(/\/admin\/loans-request$/);
    await expectPageFits(page, 'Solicitações de empréstimo');

    if (viewport.width === 375) {
      const search = page.getByRole('textbox', { name: 'Pesquisar' });
      await search.fill('Pessoa sintetica 3');
      for (const size of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await expect(search).toHaveValue('Pessoa sintetica 3');
        await expect(search).toBeFocused();
        await expectPageFits(page, 'Solicitações de empréstimo');
      }
      expect(listQueries).toBe(3);
      await search.fill('');
    }

    await page.getByRole('button', { name: 'Página 2', exact: true }).click();
    await expect(list).toContainText('Pessoa sintetica 8');
    await expectPageFits(page, 'Solicitações de empréstimo');
    await page.getByRole('button', { name: 'Primeira página' }).click();
    if ([320, 1440].includes(viewport.width))
      await page.screenshot({
        path: testInfo.outputPath(`emprestimos-${viewport.width}.png`),
        fullPage: true,
      });
    const link = first.getByRole('link');
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/history\/loan$/);
    expect(await page.evaluate(() => history.state.usr.id)).toBe(701);

  });
}

for (const viewport of responsiveViewports) {
  test(`T003 solicitacoes de cadastro ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockResponsiveSession(page, 'Administrador');
    const actions: Array<{ kind: 'approve' | 'reject'; id: number }> = [];
    let listQueries = 0;
    await page.route(
      '**/api/Usuarios/4242/dependentes/aprovacao',
      (route) => {
        listQueries++;
        return route.fulfill({ json: registrationRequestFixtures });
      }
    );
    await page.route('**/api/Usuarios/dependentes/*/aprovar', (route) => {
      actions.push({
        kind: 'approve',
        id: Number(route.request().url().match(/dependentes\/(\d+)/)?.[1]),
      });
      return route.fulfill({ json: {} });
    });
    await page.route('**/api/Usuarios/dependentes/*/rejeitar', (route) => {
      actions.push({
        kind: 'reject',
        id: Number(route.request().url().match(/dependentes\/(\d+)/)?.[1]),
      });
      return route.fulfill({ json: {} });
    });

    await page.goto('/admin/register-request');
    const list = page.getByRole('list', {
      name: 'Solicitações de cadastro',
    });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(7);
    await expectPageFits(page, 'Solicitações de cadastro');

    const first = list.getByRole('listitem').first();
    await expect(first).toContainText('A'.repeat(200));
    const labels = first.locator('dt');
    if (viewport.width < 768)
      expect((await labels.first().boundingBox())!.width).toBeGreaterThan(1);
    else {
      expect((await labels.first().boundingBox())!.width).toBe(1);
      const header = list.locator('[aria-hidden="true"] > p');
      const cells = first.locator('dd');
      for (let index = 0; index < 5; index++)
        expect(
          Math.abs(
            (await header.nth(index).boundingBox())!.x -
              (await cells.nth(index).boundingBox())!.x
          )
        ).toBeLessThanOrEqual(1);
    }

    const reject = page.getByRole('button', {
      name: new RegExp(`Recusar Pessoa A{200}`),
    });
    if (viewport.width < 768) {
      const bounds = (await reject.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await reject.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => actions).toContainEqual({ kind: 'reject', id: 501 });
    const approve = page.getByRole('button', {
      name: new RegExp(`Aprovar Pessoa A{200}`),
    });
    await approve.focus();
    await page.keyboard.press('Space');
    await expect.poll(() => actions).toContainEqual({ kind: 'approve', id: 501 });
    expect(actions).toHaveLength(2);
    await expect.poll(() => listQueries).toBe(3);
    await expectPageFits(page, 'Solicitações de cadastro');

    if (viewport.width === 375) {
      const search = page.getByRole('textbox', { name: 'Pesquisar' });
      await search.fill('Pessoa sintetica 3');
      for (const size of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await expect(search).toHaveValue('Pessoa sintetica 3');
        await expect(search).toBeFocused();
        await expectPageFits(page, 'Solicitações de cadastro');
      }
      expect(listQueries).toBe(3);
      await search.fill('');
    }

    await page.getByRole('button', { name: 'Página 2', exact: true }).click();
    await expect(list).toContainText('Pessoa sintetica 8');
    await expectPageFits(page, 'Solicitações de cadastro');
    if ([320, 1440].includes(viewport.width))
      await page.screenshot({
        path: testInfo.outputPath(`solicitacoes-${viewport.width}.png`),
        fullPage: true,
      });
  });
}
