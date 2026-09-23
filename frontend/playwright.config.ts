import { defineConfig, devices } from '@playwright/test';

const e2eBaseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

const realTestFiles = [
  '**/credential-lifecycle.spec.ts',
  '**/user-data-contract.real.spec.ts',
  '**/infra/smoke.e2e.ts',
  '**/critical/registration-approval.spec.ts',
  '**/critical/loans.spec.ts',
];

const uiTestFiles = [
  '**/error-experience.spec.ts',
  '**/feature-visibility.spec.ts',
  '**/post-auth-navigation.spec.ts',
  '**/responsive-layout.spec.ts',
  '**/user-data-contract.spec.ts',
  '**/design-system.spec.ts',
  '**/design-pilots.spec.ts',
];

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
      name: 'real',
      testMatch: realTestFiles,
      fullyParallel: false,
      retries: 0,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ui',
      testMatch: uiTestFiles,
      testIgnore: realTestFiles,
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
