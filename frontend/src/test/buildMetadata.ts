import { execSync } from 'node:child_process';

export type BuildMetadata = {
  version: string;
  gitHash: string;
  buildDate: string;
};

export type BuildMetadataEnvironment = Readonly<
  Record<string, string | undefined>
>;

export const DEFAULT_TEST_BUILD_METADATA: BuildMetadata = {
  version: 'test',
  gitHash: 'test',
  buildDate: '1970-01-01T00:00:00.000Z',
};

type GitHubReleaseResponse = {
  tag_name: string;
};

const readGitHash = (): string => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'latest';
  }
};

const fetchLatestVersion = async (): Promise<string> => {
  const response = await fetch(
    'https://api.github.com/repos/ifpebj-ti/lab-solos/releases/latest'
  );

  if (!response.ok) {
    throw new Error('Erro ao buscar versão no GitHub');
  }

  const data = (await response.json()) as GitHubReleaseResponse;
  return data.tag_name;
};

const readExplicitMetadata = (
  environment: BuildMetadataEnvironment
): Partial<BuildMetadata> => ({
  version: environment.VITE_APP_VERSION,
  gitHash: environment.VITE_APP_GIT_HASH,
  buildDate: environment.VITE_APP_BUILD_DATE,
});

const getTestBuildMetadata = (
  explicit: Partial<BuildMetadata>
): BuildMetadata => ({
  version: explicit.version ?? DEFAULT_TEST_BUILD_METADATA.version,
  gitHash: explicit.gitHash ?? DEFAULT_TEST_BUILD_METADATA.gitHash,
  buildDate: explicit.buildDate ?? DEFAULT_TEST_BUILD_METADATA.buildDate,
});

const getProductionVersion = async (
  explicitVersion: string | undefined
): Promise<string> => {
  if (explicitVersion) {
    return explicitVersion;
  }

  try {
    return await fetchLatestVersion();
  } catch {
    return 'dev';
  }
};

const getProductionBuildMetadata = async (
  explicit: Partial<BuildMetadata>
): Promise<BuildMetadata> => ({
  version: await getProductionVersion(explicit.version),
  gitHash: explicit.gitHash ?? readGitHash(),
  buildDate: explicit.buildDate ?? new Date().toISOString(),
});

export const getBuildMetadata = async (
  mode: string,
  environment: BuildMetadataEnvironment = process.env
): Promise<BuildMetadata> => {
  const explicit = readExplicitMetadata(environment);

  if (mode === 'test') {
    return getTestBuildMetadata(explicit);
  }

  return getProductionBuildMetadata(explicit);
};
