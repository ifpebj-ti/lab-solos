import { expect, test } from '@playwright/test';

test('serves the frontend from the isolated E2E stack', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page.locator('body')).toBeVisible();
});
