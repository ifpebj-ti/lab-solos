import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ trace: 'off', screenshot: 'off' });

test('espera de autenticação informa o bloqueio sem tirar o foco do formulário', async ({
  page,
}) => {
  let requestCount = 0;
  await page.route('**/api/Auth/login', async (route) => {
    requestCount += 1;
    await route.fulfill({
      status: 429,
      headers: { 'Retry-After': '30' },
      contentType: 'application/problem+json',
      body: JSON.stringify({
        type: 'https://httpstatuses.com/429',
        title: 'Tentativas limitadas',
        status: 429,
      }),
    });
  });

  await page.goto('/');
  const email = page.getByLabel('Email');
  const password = page.locator('input[name="password"]');
  await email.fill('synthetic-ui@example.invalid');
  await password.fill('Synthetic UI password 2026!');
  await password.press('Enter');

  const waitMessage = page.getByRole('status');
  await expect(waitMessage).toContainText('Aguarde 30 segundos');
  await expect(waitMessage).toHaveAttribute('aria-live', 'polite');
  await expect(waitMessage).toHaveAttribute('aria-atomic', 'true');
  await expect(password).toBeFocused();
  await expect(page.getByRole('button', { name: 'Submeter Login' })).toBeDisabled();
  expect(requestCount).toBe(1);

  const accessibility = await new AxeBuilder({ page })
    .include('main')
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
