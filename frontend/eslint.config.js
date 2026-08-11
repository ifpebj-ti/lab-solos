import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier'; // O config que DESLIGA regras conflitantes

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // Configuração JavaScript básica
  js.configs.recommended,

  // Configuração TypeScript
  ...tseslint.configs.recommended,

  // Configuração específica do projeto (TS/TSX)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // Configuração para arquivos JavaScript
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // Isso desliga regras do ESLint/TypeScript que conflitam com o Prettier
  prettierConfig,
];
