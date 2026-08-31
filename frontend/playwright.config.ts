import { defineConfig, devices } from '@playwright/test';

const e2eBaseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.e2e.ts', '**/*.spec.ts'],
  outputDir: './e2e/infra/artifacts/test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: './e2e/infra/artifacts/report', open: 'never' }],
  ],
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
