import path from 'path';
import react from '@vitejs/plugin-react';
import {
  configDefaults,
  defineConfig,
  type ViteUserConfig,
} from 'vitest/config';
import { getBuildMetadata } from './src/test/buildMetadata';

// A cobertura por linha inclui fontes de produção ainda não importadas pelos
// testes. Só saem testes, suporte de testes/build, tipos e código gerado.
const frontendCoverageInclude = ['src/**/*.{js,jsx,ts,tsx}'];
const frontendCoverageExclude = [
  'src/**/*.test.{js,jsx,ts,tsx}',
  'src/**/*.spec.{js,jsx,ts,tsx}',
  'src/**/*.stories.{js,jsx,ts,tsx}',
  'src/**/*.d.{ts,tsx}',
  'src/**/*.generated.{js,jsx,ts,tsx}',
  'src/**/generated/**',
  'src/**/__generated__/**',
  'src/**/__tests__/**',
  'src/**/__mocks__/**',
  'src/**/fixtures/**',
  'src/**/test/**',
  'src/**/tests/**',
];

const coverageRunId = /^\d+$/.test(process.env.GITHUB_RUN_ID ?? '')
  ? process.env.GITHUB_RUN_ID
  : 'local';
const coverageRunAttempt = /^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT ?? '')
  ? process.env.GITHUB_RUN_ATTEMPT
  : '1';
const coverageReportsDirectory = process.env.VITEST_COVERAGE_REPORTS_DIR
  ? path.resolve(__dirname, process.env.VITEST_COVERAGE_REPORTS_DIR)
  : path.resolve(
      __dirname,
      '../.tmp/coverage/frontend',
      `${coverageRunId}-${coverageRunAttempt}`
    );

export default defineConfig(async ({ mode }): Promise<ViteUserConfig> => {
  const { version, gitHash, buildDate } = await getBuildMetadata(
    mode,
    process.env
  );

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_GIT_HASH__: JSON.stringify(gitHash),
      __APP_BUILD_DATE__: JSON.stringify(buildDate),
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      coverage: {
        provider: 'v8',
        include: frontendCoverageInclude,
        exclude: frontendCoverageExclude,
        reportsDirectory: coverageReportsDirectory,
        reporter: ['json-summary', 'html'],
        clean: true,
      },
    },
  };
});
