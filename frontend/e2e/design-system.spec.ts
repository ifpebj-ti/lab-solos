import { expect, test } from '@playwright/test';

import {
  designThemes,
  designViewports,
  prepareDesignPage,
  runDesignAxeAudit,
  waitForDesignReady,
} from './design-support';

for (const theme of designThemes) {
  test(`design system characterizes public access in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(designViewports[0]);
    await prepareDesignPage(page, { theme });
    await page.addInitScript((storedTheme) => {
      window.localStorage.setItem('labon.theme.v1', storedTheme);
    }, theme);
    await page.goto('/');
    await waitForDesignReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect
      .poll(() =>
        page.locator('html').evaluate((element) => element.style.colorScheme)
      )
      .toBe(theme);

    await expect(
      page.getByRole('heading', { name: /Entrar no LabOn/i })
    ).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Submeter Login', exact: true })
    ).toBeVisible();

    await runDesignAxeAudit(page, testInfo, `public-access-${theme}`);
  });

  test(`design system mantém teclado e largura estreita em ${theme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await prepareDesignPage(page, { theme });
    await page.addInitScript((storedTheme) => {
      window.localStorage.setItem('labon.theme.v1', storedTheme);
    }, theme);
    await page.goto('/');
    await waitForDesignReady(page);

    const email = page.getByLabel('Email', { exact: true });
    const password = page.getByLabel('Senha', { exact: true });
    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  });

  test(`design system associa o PopoverInput real em ${theme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await prepareDesignPage(page, { theme, role: 'Mentor' });
    await page.addInitScript((storedTheme) => {
      window.localStorage.setItem('labon.theme.v1', storedTheme);
    }, theme);
    await page.goto('/mentor/loan/creation');
    await waitForDesignReady(page);

    const userField = page.getByRole('combobox', {
      name: 'Usuário',
      exact: true,
    });
    await expect(userField).toBeVisible();
    await expect(userField).toHaveAttribute('type', 'button');
    await expect(userField).not.toHaveAttribute('aria-invalid', 'true');

    await userField.click();
    await expect(page.getByPlaceholder('Pesquisar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(userField).toHaveAttribute('aria-expanded', 'false');
  });
}
