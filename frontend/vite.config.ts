import path from 'path';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';
import { getBuildMetadata } from './src/test/buildMetadata';

export default defineConfig(async ({ mode }) => {
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
    },
  };
});
