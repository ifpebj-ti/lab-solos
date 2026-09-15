import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const composeProject =
  process.env.E2E_COMPOSE_PROJECT ?? 'lab-solos-quality-t024';
const defaultScenario =
  process.env.E2E_SEED_SCENARIO ??
  (composeProject.replace(/^lab-solos-quality-/, '') || 't024');
const apiUrl =
  process.env.E2E_API_URL ??
  `http://127.0.0.1:${process.env.E2E_BACKEND_PORT ?? '18080'}/api`;
const smtpUrl =
  process.env.E2E_SMTP_API_URL ??
  `http://127.0.0.1:${process.env.E2E_SMTP_PORT ?? '18025'}`;

export type ScenarioCredentials = {
  email: string;
  password: string;
};

export type E2eScenarioData = {
  composeProject: string;
  scenario: string;
  apiUrl: string;
  smtpUrl: string;
  administrator: ScenarioCredentials;
  mentor: ScenarioCredentials;
  borrower: ScenarioCredentials;
};

const credential = (
  role: 'admin' | 'mentor' | 'borrower',
  scenario: string,
  emailVariable: string,
  passwordVariable: string
): ScenarioCredentials => ({
  email:
    process.env[emailVariable] ??
    `synthetic-${role}-${scenario}@example.invalid`,
  password:
    process.env[passwordVariable] ??
    `synthetic-${role}-${scenario}-password`,
});

export const scenarioData = (
  scenario = defaultScenario
): E2eScenarioData => ({
  composeProject,
  scenario,
  apiUrl,
  smtpUrl,
  administrator: credential(
    'admin',
    scenario,
    'E2E_SEED_ADMIN_EMAIL',
    'E2E_SEED_ADMIN_PASSWORD'
  ),
  mentor: credential(
    'mentor',
    scenario,
    'E2E_SEED_MENTOR_EMAIL',
    'E2E_SEED_MENTOR_PASSWORD'
  ),
  borrower: credential(
    'borrower',
    scenario,
    'E2E_SEED_BORROWER_EMAIL',
    'E2E_SEED_BORROWER_PASSWORD'
  ),
});

export const e2eScenario = scenarioData();

export async function seedE2eScenario(
  scenario = e2eScenario.scenario
): Promise<void> {
  const data = scenarioData(scenario);
  const repositoryRoot = path.resolve(process.cwd(), '..');
  const composeFile = path.join(repositoryRoot, 'docker-compose-e2e.yml');
  const environment = {
    ...process.env,
    E2E_COMPOSE_PROJECT: data.composeProject,
    E2E_SEED_SCENARIO: data.scenario,
    E2E_SEED_ENVIRONMENT: 'E2E',
    E2E_SEED_ADMIN_EMAIL: data.administrator.email,
    E2E_SEED_ADMIN_PASSWORD: data.administrator.password,
    E2E_SEED_MENTOR_EMAIL: data.mentor.email,
    E2E_SEED_MENTOR_PASSWORD: data.mentor.password,
    E2E_SEED_BORROWER_EMAIL: data.borrower.email,
    E2E_SEED_BORROWER_PASSWORD: data.borrower.password,
  };

  try {
    await execFileAsync(
      'docker',
      [
        'compose',
        '--project-name',
        data.composeProject,
        '--file',
        composeFile,
        '--profile',
        'seed',
        'run',
        '--rm',
        '--no-deps',
        'e2e-seed',
        '--scenario',
        data.scenario,
      ],
      {
        cwd: repositoryRoot,
        env: environment,
        maxBuffer: 1024 * 1024,
      }
    );
  } catch {
    throw new Error('A preparação do cenário E2E falhou.');
  }
}
