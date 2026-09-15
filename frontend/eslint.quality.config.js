import globals from 'globals';
import baseConfig from './eslint.config.js';

const analyzableFiles = ['**/*.{js,jsx,ts,tsx,mjs,cjs}'];

const sourceFiles = [
  'src/**/*.{js,jsx,ts,tsx}',
  '**/src/**/*.{js,jsx,ts,tsx}',
];

const nodeFiles = [
  'e2e/**/*.{js,jsx,ts,tsx}',
  '**/e2e/**/*.{js,jsx,ts,tsx}',
  '**/vite.config.{js,ts,mjs,cjs}',
  '**/playwright.config.{js,ts,mjs,cjs}',
];

const generatedFiles = [
  '**/coverage/**',
  '**/reports/**',
  '**/test-results/**',
  '**/playwright-report/**',
  '**/e2e/infra/artifacts/**',
  '**/.tmp/**',
];

export default [
  ...baseConfig,
  {
    // A coleta de qualidade recebe somente código próprio; saídas geradas
    // continuam fora da análise mesmo quando um diretório pai é informado.
    ignores: generatedFiles,
  },
  {
    files: analyzableFiles,
    rules: {
      complexity: ['warn', { max: 20 }],
      'max-depth': ['warn', 4],
    },
  },
  {
    files: sourceFiles,
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
];
