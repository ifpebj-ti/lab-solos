import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

import { scenarioData, seedE2eScenario } from './infra/e2e-data';

type LoginResponse = { requiresPasswordChange: boolean };
type BrowserSession = { userId: string | number; csrfToken: string };
type SeededUser = { id: number; email: string; nivelUsuario: string };
type Notification = { id: number; titulo: string; lida: boolean };
type AuditLog = {
  id: number;
  codigoEvento: string;
  acao: string;
  recurso: string;
  origem: string;
  resultado: string;
  suspeita: boolean;
  revisaoClassificacao: number;
  historicoClassificacao: Array<{
    numeroRevisao: number;
    suspeitaAnterior: boolean;
    suspeitaResultante: boolean;
    justificativa: string;
    autorUsuarioId: number | null;
    origem: string;
  }>;
};
type AuditPage = {
  itens: AuditLog[];
  totalItens: number;
  totalPaginas: number;
};

const frontendBaseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const compatibleRollbackCommit = 'a0e9929287a0d97a0743a95b3771d45099e2a099';
let scenario = scenarioData(`notifications-audit-${process.pid}-${Date.now()}`);

test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

test.beforeEach(async () => {
  scenario = scenarioData(`notifications-audit-${process.pid}-${Date.now()}`);
  await seedE2eScenario(scenario.scenario);
});

async function loginThroughUi(
  page: Page,
  email: string,
  password: string,
  destination: 'admin' | 'mentor' | 'mentee'
): Promise<void> {
  await page.goto(`${frontendBaseUrl}/`);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url() === `${scenario.apiUrl}/Auth/login` &&
      response.request().method() === 'POST'
  );
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Submeter Login' }).click();
  const response = await loginResponse;
  expect(response.status()).toBe(200);
  const payload = (await response.json()) as LoginResponse;
  expect(payload.requiresPasswordChange).toBe(false);
  await expect(page).toHaveURL(new RegExp(`/${destination}/?$`));
}

async function readSession(api: APIRequestContext): Promise<BrowserSession> {
  const response = await api.get(`${scenario.apiUrl}/Auth/session`);
  expect(response.status()).toBe(200);
  const session = (await response.json()) as BrowserSession;
  expect(session.csrfToken).not.toBe('');
  return session;
}

async function readNotification(
  api: APIRequestContext,
  id: number
): Promise<Notification> {
  const response = await api.get(`${scenario.apiUrl}/Notificacoes/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as Notification;
}

async function waitForApi(api: APIRequestContext): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          return (await api.get(`${scenario.apiUrl}/System/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 }
    )
    .toBe(200);
}

function restartSyntheticBackend(): void {
  const repositoryRoot = path.resolve(process.cwd(), '..');
  const composeFile = path.join(repositoryRoot, 'docker-compose-e2e.yml');
  execFileSync(
    'docker',
    [
      'compose',
      '--project-name',
      scenario.composeProject,
      '--file',
      composeFile,
      'restart',
      'backend',
    ],
    { cwd: repositoryRoot, stdio: 'pipe', timeout: 45_000 }
  );
}

function ensureRollbackCommit(repositoryRoot: string): void {
  try {
    execFileSync(
      'git',
      ['cat-file', '-e', `${compatibleRollbackCommit}^{commit}`],
      {
        cwd: repositoryRoot,
        stdio: 'ignore',
      }
    );
    return;
  } catch {
    // Fetch the pinned commit when the checkout is shallow.
  }

  try {
    execFileSync(
      'git',
      ['fetch', '--no-tags', '--depth=1', 'origin', compatibleRollbackCommit],
      { cwd: repositoryRoot, stdio: 'ignore', timeout: 60_000 }
    );
  } catch {
    throw new Error('A revisão compatível de retorno não está disponível.');
  }
}

function runRollbackCompose(
  repositoryRoot: string,
  composeFile: string,
  args: string[],
  failureMessage: string
): void {
  try {
    execFileSync(
      'docker',
      [
        'compose',
        '--project-name',
        scenario.composeProject,
        '--file',
        composeFile,
        ...args,
      ],
      { cwd: repositoryRoot, stdio: 'pipe', timeout: 180_000 }
    );
  } catch {
    throw new Error(failureMessage);
  }
}

function getRollbackContainerId(
  repositoryRoot: string,
  composeFile: string,
  composeOverride: string | undefined,
  failureMessage: string
): string {
  const args = [
    'compose',
    '--project-name',
    scenario.composeProject,
    '--file',
    composeFile,
  ];
  if (composeOverride) args.push('--file', composeOverride);
  args.push('ps', '--quiet', 'backend');

  try {
    return execFileSync('docker', args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
  } catch {
    throw new Error(failureMessage);
  }
}

function inspectRollbackImage(
  repositoryRoot: string,
  containerId: string,
  failureMessage: string
): string {
  try {
    return execFileSync(
      'docker',
      ['inspect', '--format', '{{.Config.Image}}', containerId],
      { cwd: repositoryRoot, encoding: 'utf8', stdio: 'pipe' }
    ).trim();
  } catch {
    throw new Error(failureMessage);
  }
}

function removeRollbackWorktree(
  repositoryRoot: string,
  candidateWorktree: string,
  created: boolean
): Error | undefined {
  if (!created) return undefined;
  try {
    execFileSync('git', ['worktree', 'remove', '--force', candidateWorktree], {
      cwd: repositoryRoot,
      stdio: 'ignore',
      timeout: 60_000,
    });
    return undefined;
  } catch {
    return new Error('A worktree descartável não foi removida.');
  }
}

async function restoreCurrentRollbackBackend(
  api: APIRequestContext,
  repositoryRoot: string,
  composeFile: string,
  candidateImage: string
): Promise<Error | undefined> {
  const errors: Error[] = [];
  try {
    runRollbackCompose(
      repositoryRoot,
      composeFile,
      [
        'up',
        '--detach',
        '--wait',
        '--no-deps',
        '--build',
        '--force-recreate',
        'backend',
      ],
      'O backend do checkout atual não foi restaurado.'
    );
  } catch {
    errors.push(new Error('O backend do checkout atual não foi restaurado.'));
  }

  let restoredContainerId = '';
  try {
    restoredContainerId = getRollbackContainerId(
      repositoryRoot,
      composeFile,
      undefined,
      'Não foi possível confirmar o backend restaurado.'
    );
  } catch {
    errors.push(new Error('Não foi possível confirmar o backend restaurado.'));
  }
  if (!restoredContainerId) {
    errors.push(new Error('O backend do checkout atual não está ativo.'));
  } else {
    try {
      const restoredImage = inspectRollbackImage(
        repositoryRoot,
        restoredContainerId,
        'Não foi possível conferir a imagem restaurada.'
      );
      if (restoredImage === candidateImage) {
        errors.push(
          new Error('O backend candidato continuou ativo após o retorno.')
        );
      }
    } catch {
      errors.push(new Error('Não foi possível conferir a imagem restaurada.'));
    }
  }

  try {
    await waitForApi(api);
  } catch {
    errors.push(
      new Error('A API do checkout atual não ficou disponível após o retorno.')
    );
  }
  if (errors.length === 0) return undefined;
  if (errors.length === 1) return errors[0];
  return new AggregateError(
    errors,
    'A restauração do backend teve múltiplas falhas.'
  );
}

async function withCompatibleRollbackBackend(
  api: APIRequestContext,
  verifyState: () => Promise<void>
): Promise<void> {
  const repositoryRoot = path.resolve(process.cwd(), '..');
  const composeFile = path.join(repositoryRoot, 'docker-compose-e2e.yml');
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'lab-solos-t010-compatible-rollback-')
  );
  const candidateWorktree = path.join(temporaryRoot, 'candidate');
  const composeOverride = path.join(temporaryRoot, 'compose.compatible.yml');
  const candidateImage = `lab-solos-t010-compatible-rollback:${compatibleRollbackCommit.slice(0, 12)}-${process.pid}`;
  let worktreeCreated = false;
  let candidateSwitchAttempted = false;
  let operationFailed = false;
  let operationError: unknown;
  let cleanupError: Error | undefined;

  try {
    ensureRollbackCommit(repositoryRoot);
    execFileSync(
      'git',
      [
        'worktree',
        'add',
        '--detach',
        candidateWorktree,
        compatibleRollbackCommit,
      ],
      { cwd: repositoryRoot, stdio: 'ignore', timeout: 60_000 }
    );
    worktreeCreated = true;

    const candidateBackendContext = path.join(candidateWorktree, 'backend');
    await writeFile(
      composeOverride,
      [
        'services:',
        '  backend:',
        `    image: ${JSON.stringify(candidateImage)}`,
        '    build:',
        `      context: ${JSON.stringify(candidateBackendContext)}`,
        '      dockerfile: Dockerfile',
        '',
      ].join('\n'),
      'utf8'
    );

    candidateSwitchAttempted = true;
    runRollbackCompose(
      repositoryRoot,
      composeFile,
      [
        '--file',
        composeOverride,
        'up',
        '--detach',
        '--wait',
        '--no-deps',
        '--build',
        'backend',
      ],
      'A composição descartável não iniciou o backend candidato.'
    );
    const containerId = getRollbackContainerId(
      repositoryRoot,
      composeFile,
      composeOverride,
      'Não foi possível identificar o backend candidato.'
    );
    if (!containerId) {
      throw new Error('O contêiner de retorno compatível não foi iniciado.');
    }
    const runningImage = inspectRollbackImage(
      repositoryRoot,
      containerId,
      'Não foi possível conferir a imagem ativa do backend.'
    );
    if (runningImage !== candidateImage) {
      throw new Error('A imagem compatível esperada não está ativa.');
    }

    await waitForApi(api);
    await verifyState();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  } finally {
    if (candidateSwitchAttempted) {
      cleanupError = await restoreCurrentRollbackBackend(
        api,
        repositoryRoot,
        composeFile,
        candidateImage
      );
    }
    cleanupError ??= removeRollbackWorktree(
      repositoryRoot,
      candidateWorktree,
      worktreeCreated
    );
    try {
      execFileSync('docker', ['image', 'rm', '--force', candidateImage], {
        cwd: repositoryRoot,
        stdio: 'ignore',
        timeout: 30_000,
      });
    } catch {
      // The image can be absent when building the candidate failed.
    }
    try {
      await rm(temporaryRoot, { recursive: true, force: true });
    } catch {
      cleanupError ??= new Error(
        'Os arquivos temporários do retorno não foram removidos.'
      );
    }
  }

  if (operationFailed && cleanupError) {
    throw new AggregateError(
      [operationError, cleanupError],
      'O ensaio de retorno e a restauração do backend falharam.'
    );
  }
  if (operationFailed) throw operationError;
  if (cleanupError) throw cleanupError;
}

test('notificação e auditoria mantêm escopo, revisão e leitura após retorno da API', async ({
  browser,
  page,
}) => {
  await loginThroughUi(
    page,
    scenario.administrator.email,
    scenario.administrator.password,
    'admin'
  );

  const adminContext = page.context();
  const adminApi = adminContext.request;
  const adminSession = await readSession(adminApi);
  const adminId = Number(adminSession.userId);
  const writeHeaders = {
    Origin: frontendBaseUrl,
    'X-CSRF-Token': adminSession.csrfToken,
  };

  const usersResponse = await adminApi.get(`${scenario.apiUrl}/Usuarios`);
  expect(usersResponse.status()).toBe(200);
  const users = (await usersResponse.json()) as SeededUser[];
  const mentor = users.find(
    (user) => user.email.toLowerCase() === scenario.mentor.email.toLowerCase()
  );
  const mentee = users.find(
    (user) => user.email.toLowerCase() === scenario.borrower.email.toLowerCase()
  );
  expect(mentor).toBeDefined();
  expect(mentee).toBeDefined();

  const mentorTitle = `Aviso E2E ${scenario.scenario} Mentor`;
  const menteeTitle = `Aviso E2E ${scenario.scenario} Mentorado`;
  const createNotification = async (recipientId: number, title: string) => {
    const response = await adminApi.post(`${scenario.apiUrl}/Notificacoes`, {
      headers: writeHeaders,
      data: {
        titulo: title,
        mensagem: 'Conteúdo sintético para validar a leitura individual.',
        tipo: 'Sistema',
        usuarioId: recipientId,
      },
    });
    expect(response.status()).toBe(201);
    return (await response.json()) as Notification;
  };

  const mentorNotification = await createNotification(mentor!.id, mentorTitle);
  const menteeNotification = await createNotification(mentee!.id, menteeTitle);
  const collectiveTitle = `Aviso E2E ${scenario.scenario} Coletivo`;
  const collectiveResponse = await adminApi.post(
    `${scenario.apiUrl}/Notificacoes`,
    {
      headers: writeHeaders,
      data: {
        titulo: collectiveTitle,
        mensagem:
          'Conteúdo coletivo sintético para validar o retorno compatível.',
        tipo: 'Sistema',
        usuarioId: null,
        ehGlobal: true,
      },
    }
  );
  expect(collectiveResponse.status()).toBe(201);
  const collectiveNotification =
    (await collectiveResponse.json()) as Notification;

  const mentorContext = await browser.newContext();
  const mentorPage = await mentorContext.newPage();
  const menteeContext = await browser.newContext();
  const menteePage = await menteeContext.newPage();

  try {
    await loginThroughUi(
      mentorPage,
      scenario.mentor.email,
      scenario.mentor.password,
      'mentor'
    );
    await loginThroughUi(
      menteePage,
      scenario.borrower.email,
      scenario.borrower.password,
      'mentee'
    );

    const mentorUnread = await mentorContext.request.get(
      `${scenario.apiUrl}/Notificacoes/minhas?apenasNaoLidas=true`
    );
    expect(mentorUnread.status()).toBe(200);
    const mentorUnreadItems = (await mentorUnread.json()) as Notification[];
    expect(mentorUnreadItems.map((item) => item.titulo)).toContain(mentorTitle);
    expect(mentorUnreadItems.map((item) => item.titulo)).toContain(
      collectiveTitle
    );
    expect(mentorUnreadItems.map((item) => item.titulo)).not.toContain(
      menteeTitle
    );
    const mentorCount = await mentorContext.request.get(
      `${scenario.apiUrl}/Notificacoes/count-nao-lidas`
    );
    expect(mentorCount.status()).toBe(200);
    expect((await mentorCount.json()).count).toBe(2);

    const menteeUnread = await menteeContext.request.get(
      `${scenario.apiUrl}/Notificacoes/minhas?apenasNaoLidas=true`
    );
    expect(menteeUnread.status()).toBe(200);
    const menteeUnreadItems = (await menteeUnread.json()) as Notification[];
    expect(menteeUnreadItems.map((item) => item.titulo)).toContain(menteeTitle);
    expect(menteeUnreadItems.map((item) => item.titulo)).toContain(
      collectiveTitle
    );
    expect(menteeUnreadItems.map((item) => item.titulo)).not.toContain(
      mentorTitle
    );
    const menteeCount = await menteeContext.request.get(
      `${scenario.apiUrl}/Notificacoes/count-nao-lidas`
    );
    expect(menteeCount.status()).toBe(200);
    expect((await menteeCount.json()).count).toBe(2);

    const notificationButton = mentorPage
      .getByRole('button', { name: /Notificações/ })
      .first();
    await expect(notificationButton).toBeVisible();
    await notificationButton.click();
    await expect(
      mentorPage.getByText(mentorTitle, { exact: true })
    ).toBeVisible();
    await mentorPage.getByText(mentorTitle, { exact: true }).click();
    await expect
      .poll(
        async () =>
          (await readNotification(mentorContext.request, mentorNotification.id))
            .lida
      )
      .toBe(true);
    expect(
      (await readNotification(menteeContext.request, menteeNotification.id))
        .lida
    ).toBe(false);

    const mentorSession = await readSession(mentorContext.request);
    const collectiveRead = await mentorContext.request.patch(
      `${scenario.apiUrl}/Notificacoes/${collectiveNotification.id}/marcar-lida`,
      {
        headers: {
          Origin: frontendBaseUrl,
          'X-CSRF-Token': mentorSession.csrfToken,
        },
      }
    );
    expect(collectiveRead.status()).toBe(200);

    const auditResponse = await adminApi.get(
      `${scenario.apiUrl}/Auditoria/logs?recurso=notificacao:${collectiveNotification.id}&pagina=1&tamanhoPagina=25`
    );
    expect(auditResponse.status()).toBe(200);
    const auditPage = (await auditResponse.json()) as AuditPage;
    const emission = auditPage.itens.find(
      (item) => item.codigoEvento === 'EmissaoNotificacao'
    );
    expect(emission).toBeDefined();
    expect(emission?.recurso).toBe(`notificacao:${collectiveNotification.id}`);
    expect(emission?.origem).toBe('UsuarioAutenticado');
    expect(emission?.resultado).toBe('Sucesso');
    for (const sensitiveField of [
      'emailUsuario',
      'enderecoIP',
      'dadosRequisicao',
      'dadosResposta',
    ]) {
      expect(emission).not.toHaveProperty(sensitiveField);
    }

    await page.goto(`${frontendBaseUrl}/admin/auditoria`);
    await expect(
      page.getByRole('heading', { name: 'Auditoria de Segurança' })
    ).toBeVisible();
    await page
      .getByLabel('Recurso')
      .fill(`notificacao:${collectiveNotification.id}`);
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(
      page.getByText('EmissaoNotificacao', { exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Marcar suspeito' }).click();
    await page
      .getByLabel('Justificativa da revisão')
      .fill('Revisão sintética de emissão de notificação.');
    await page.getByRole('button', { name: 'Salvar revisão' }).click();
    await expect(page.getByText('Suspeito', { exact: true })).toBeVisible();
    await page.getByText('Histórico e regra').click();
    await expect(page.getByText('Revisão 1', { exact: true })).toBeVisible();
    await expect(
      page.getByText(`Autor: ID ${adminId}`, { exact: true })
    ).toBeVisible();
    const auditSection = page.getByRole('region', {
      name: 'Logs de auditoria',
    });
    await expect(
      auditSection.getByText(scenario.administrator.email, { exact: true })
    ).toHaveCount(0);

    const exportResponse = await adminApi.get(
      `${scenario.apiUrl}/Auditoria/exportar?recurso=notificacao:${collectiveNotification.id}`
    );
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()['content-type']).toContain('text/csv');
    expect(exportResponse.headers()['cache-control']).toContain('no-store');
    const csv = await exportResponse.text();
    expect(csv).toContain(`notificacao:${collectiveNotification.id}`);
    expect(csv).not.toContain(scenario.administrator.email);
    expect(csv).not.toContain('synthetic-e2e-jwt-signing-key');

    const assertPersistedStateAndAudit = async () => {
      expect(
        (await readNotification(mentorContext.request, mentorNotification.id))
          .lida
      ).toBe(true);
      expect(
        (await readNotification(menteeContext.request, menteeNotification.id))
          .lida
      ).toBe(false);
      expect(
        (
          await readNotification(
            mentorContext.request,
            collectiveNotification.id
          )
        ).lida
      ).toBe(true);
      expect(
        (
          await readNotification(
            menteeContext.request,
            collectiveNotification.id
          )
        ).lida
      ).toBe(false);

      const mentorUnreadAfter = await mentorContext.request.get(
        `${scenario.apiUrl}/Notificacoes/minhas?apenasNaoLidas=true`
      );
      const menteeUnreadAfter = await menteeContext.request.get(
        `${scenario.apiUrl}/Notificacoes/minhas?apenasNaoLidas=true`
      );
      expect(mentorUnreadAfter.status()).toBe(200);
      expect(menteeUnreadAfter.status()).toBe(200);
      expect(
        ((await mentorUnreadAfter.json()) as Notification[]).map(
          (item) => item.titulo
        )
      ).not.toContain(collectiveTitle);
      expect(
        ((await menteeUnreadAfter.json()) as Notification[]).map(
          (item) => item.titulo
        )
      ).toContain(collectiveTitle);

      const mentorCountAfter = await mentorContext.request.get(
        `${scenario.apiUrl}/Notificacoes/count-nao-lidas`
      );
      const menteeCountAfter = await menteeContext.request.get(
        `${scenario.apiUrl}/Notificacoes/count-nao-lidas`
      );
      expect(mentorCountAfter.status()).toBe(200);
      expect(menteeCountAfter.status()).toBe(200);
      expect((await mentorCountAfter.json()).count).toBe(0);
      expect((await menteeCountAfter.json()).count).toBe(2);

      const persistedAuditResponse = await adminApi.get(
        `${scenario.apiUrl}/Auditoria/logs?recurso=notificacao:${collectiveNotification.id}&pagina=1&tamanhoPagina=25`
      );
      expect(persistedAuditResponse.status()).toBe(200);
      const persistedAudit = (await persistedAuditResponse.json()) as AuditPage;
      const persistedEmission = persistedAudit.itens.find(
        (item) => item.codigoEvento === 'EmissaoNotificacao'
      );
      expect(persistedEmission?.revisaoClassificacao).toBe(1);
      expect(persistedEmission?.historicoClassificacao).toEqual([
        expect.objectContaining({
          numeroRevisao: 1,
          suspeitaAnterior: false,
          suspeitaResultante: true,
          justificativa: 'Revisão sintética de emissão de notificação.',
          autorUsuarioId: adminId,
          origem: 'RevisaoManual',
        }),
      ]);
    };

    restartSyntheticBackend();
    await waitForApi(adminApi);
    await assertPersistedStateAndAudit();

    await withCompatibleRollbackBackend(adminApi, assertPersistedStateAndAudit);
    await assertPersistedStateAndAudit();
  } finally {
    await mentorContext.close();
    await menteeContext.close();
  }
});
