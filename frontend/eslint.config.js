import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier'; // O plugin que RODA o Prettier
import prettierConfig from 'eslint-config-prettier'; // O config que DESLIGA regras conflitantes

export default [
  // Configuração JavaScript básica
  js.configs.recommended,

  // Configuração TypeScript
  ...tseslint.configs.recommended,

  // Configuração específica do projeto (TS/TSX)
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['dist'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier, // <--- Plugin registrado aqui
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'prettier/prettier': 'warn', // <--- Regra usada aqui
    },
  },

  // Configuração para arquivos JavaScript
  {
    files: ['**/*.js'],
    ignores: ['dist'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      prettier, // <--- SOLUÇÃO 1: Registre o plugin aqui também
    },
    rules: {
      'no-undef': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }], // <--- Agora vai funcionar
    },
  },

  // SOLUÇÃO 2: Adicione isso AO FINAL do array
  // Isso desliga regras do ESLint/TypeScript que conflitam com o Prettier
  prettierConfig,
];
