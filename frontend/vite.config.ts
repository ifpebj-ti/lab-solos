import path from 'path';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';
import { execSync } from 'child_process';

let gitHash = 'latest';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  console.warn('Git não encontrado ou erro ao ler hash, mantendo "latest".');
}

const buildDate = new Date().toISOString();

type GitHubReleaseResponse = {
  tag_name: string;
};

const fetchLatestVersion = async (): Promise<string> => {
  const res = await fetch(
    'https://api.github.com/repos/ifpebj-ti/lab-solos/releases/latest'
  );

  if (!res.ok) {
    throw new Error('Erro ao buscar versão no GitHub');
  }

  const data = (await res.json()) as GitHubReleaseResponse;
  return data.tag_name;
};

export default defineConfig(async () => {
  let appVersion = 'dev';

  try {
    appVersion = await fetchLatestVersion();
  } catch {
    console.warn('Não foi possível buscar a versão, usando "dev".');
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_GIT_HASH__: JSON.stringify(gitHash),
      __APP_BUILD_DATE__: JSON.stringify(buildDate),
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  };
});
