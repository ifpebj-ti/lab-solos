// @vitest-environment node

import { fileURLToPath } from 'node:url';
import { loadConfigFromFile } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_TEST_BUILD_METADATA,
  getBuildMetadata,
} from './buildMetadata';

const configFile = fileURLToPath(
  new URL('../../vite.config.ts', import.meta.url)
);

const explicitMetadata = {
  VITE_APP_VERSION: 'v9.8.7',
  VITE_APP_GIT_HASH: 'abc1234',
  VITE_APP_BUILD_DATE: '2026-09-14T12:34:56.000Z',
};

function readDefinedValue(
  config: { define?: Record<string, string> },
  key: string
) {
  const value = config.define?.[key];
  return value === undefined ? undefined : JSON.parse(value);
}

async function loadEffectiveConfig(mode: string) {
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode },
    configFile
  );

  if (!loaded) {
    throw new Error(`Vite configuration did not load for mode ${mode}`);
  }

  return loaded.config;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('build metadata', () => {
  it('uses deterministic defaults for the test mode', async () => {
    const first = await getBuildMetadata('test', {});
    const second = await getBuildMetadata('test', {});

    expect(first).toEqual(DEFAULT_TEST_BUILD_METADATA);
    expect(second).toEqual(first);
  });

  it('accepts explicit metadata in every mode', async () => {
    await expect(
      getBuildMetadata('test', explicitMetadata)
    ).resolves.toEqual({
      version: explicitMetadata.VITE_APP_VERSION,
      gitHash: explicitMetadata.VITE_APP_GIT_HASH,
      buildDate: explicitMetadata.VITE_APP_BUILD_DATE,
    });

    await expect(
      getBuildMetadata('production', explicitMetadata)
    ).resolves.toEqual({
      version: explicitMetadata.VITE_APP_VERSION,
      gitHash: explicitMetadata.VITE_APP_GIT_HASH,
      buildDate: explicitMetadata.VITE_APP_BUILD_DATE,
    });
  });
});

describe('effective Vite configuration', () => {
  it('does not access release network or wall-clock metadata in test mode', async () => {
    vi.stubEnv('VITE_APP_VERSION', explicitMetadata.VITE_APP_VERSION);
    vi.stubEnv('VITE_APP_GIT_HASH', explicitMetadata.VITE_APP_GIT_HASH);
    vi.stubEnv('VITE_APP_BUILD_DATE', explicitMetadata.VITE_APP_BUILD_DATE);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network access is forbidden in tests'));

    const config = await loadEffectiveConfig('test');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readDefinedValue(config, '__APP_VERSION__')).toBe(
      explicitMetadata.VITE_APP_VERSION
    );
    expect(readDefinedValue(config, '__APP_GIT_HASH__')).toBe(
      explicitMetadata.VITE_APP_GIT_HASH
    );
    expect(readDefinedValue(config, '__APP_BUILD_DATE__')).toBe(
      explicitMetadata.VITE_APP_BUILD_DATE
    );
  });

  it('keeps explicit application identification in production mode', async () => {
    vi.stubEnv('VITE_APP_VERSION', explicitMetadata.VITE_APP_VERSION);
    vi.stubEnv('VITE_APP_GIT_HASH', explicitMetadata.VITE_APP_GIT_HASH);
    vi.stubEnv('VITE_APP_BUILD_DATE', explicitMetadata.VITE_APP_BUILD_DATE);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const config = await loadEffectiveConfig('production');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readDefinedValue(config, '__APP_VERSION__')).toBe(
      explicitMetadata.VITE_APP_VERSION
    );
    expect(readDefinedValue(config, '__APP_GIT_HASH__')).toBe(
      explicitMetadata.VITE_APP_GIT_HASH
    );
    expect(readDefinedValue(config, '__APP_BUILD_DATE__')).toBe(
      explicitMetadata.VITE_APP_BUILD_DATE
    );
  });
});
