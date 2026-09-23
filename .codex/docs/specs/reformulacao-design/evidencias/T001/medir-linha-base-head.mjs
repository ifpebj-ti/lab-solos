import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const requireFromFrontend = createRequire(
  new URL('../../../../../../frontend/package.json', import.meta.url),
);
const { chromium } = requireFromFrontend('@playwright/test');

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:14173';
const scenario = process.env.E2E_SEED_SCENARIO ?? 't001-baseline-head';
const baselineCommit = process.env.E2E_BASELINE_COMMIT ?? 'not-recorded';
const buildIdentity = process.env.E2E_BUILD_ID ?? null;
const viewport = { width: 1440, height: 900 };
const iterations = 5;
const outputPath =
  process.env.T001_OUTPUT_PATH ??
  new URL('./medicoes-head-8c2a8bd-2026-09-23.json', import.meta.url);
const token = createHash('sha256').update(scenario).digest('hex').slice(0, 12);
const productName = `E2E Product ${token}`;
const borrowerName = `E2E Borrower ${token}`;

const credentials = {
  Administrador: {
    email:
      process.env.E2E_SEED_ADMIN_EMAIL ??
      `synthetic-admin-${scenario}@example.invalid`,
    password:
      process.env.E2E_SEED_ADMIN_PASSWORD ??
      `synthetic-admin-${scenario}-password`,
  },
  Mentor: {
    email:
      process.env.E2E_SEED_MENTOR_EMAIL ??
      `synthetic-mentor-${scenario}@example.invalid`,
    password:
      process.env.E2E_SEED_MENTOR_PASSWORD ??
      `synthetic-mentor-${scenario}-password`,
  },
};

const now = () => Number(process.hrtime.bigint()) / 1_000_000;
const median = (values) => {
  const numbers = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 0
    ? (numbers[middle - 1] + numbers[middle]) / 2
    : numbers[middle];
};
const unique = (values) => [...new Set(values)];

const scenarios = [
  {
    name: 'login-administrador',
    role: 'Administrador',
    path: '/',
  },
  {
    name: 'inicio-administrador',
    role: 'Administrador',
    path: '/admin/',
  },
  {
    name: 'catalogo-administrador',
    role: 'Administrador',
    path: '/admin/search-material',
  },
  {
    name: 'criacao-mentor',
    role: 'Mentor',
    path: '/mentor/loan/creation',
  },
];

const authenticate = async (page, role) => {
  const user = credentials[role];
  await page.goto(new URL('/', baseURL).toString(), {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('button', { name: 'Submeter Login' }).waitFor();
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: 'Submeter Login' }).click();
  const destination = role === 'Administrador' ? /\/admin\/?$/ : /\/mentor\/?$/;
  await page.waitForURL(destination, { timeout: 20_000 });
  await page.getByRole('heading', { name: 'Home' }).waitFor();
};

const installObservability = (page) => {
  const observed = {
    responseCount: 0,
    apiResponseCount: 0,
    responseBytesByHeader: 0,
    unknownLengthResponses: 0,
    httpErrors: [],
    apiStatuses: {},
    requestFailures: [],
    consoleErrors: [],
    pageErrors: [],
  };

  page.on('response', async (response) => {
    observed.responseCount += 1;
    const url = response.url();
    const isApi = /\/api\//i.test(url);
    if (isApi) observed.apiResponseCount += 1;
    const status = response.status();
    if (isApi) {
      const key = String(status);
      observed.apiStatuses[key] = (observed.apiStatuses[key] ?? 0) + 1;
    }
    const length = Number(response.headers()['content-length']);
    if (Number.isFinite(length) && length >= 0) {
      observed.responseBytesByHeader += length;
    } else {
      observed.unknownLengthResponses += 1;
    }
    if (status >= 400) {
      observed.httpErrors.push({ status, pathname: new URL(url).pathname });
    }
  });
  page.on('requestfailed', (request) => {
    observed.requestFailures.push({
      method: request.method(),
      pathname: new URL(request.url()).pathname,
      failure: request.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') observed.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => observed.pageErrors.push(String(error)));
  return observed;
};

const resourceMetrics = async (page) =>
  page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const entries = [navigation, ...resources].filter(Boolean);
    const sum = (key) =>
      entries.reduce((total, entry) => total + (Number(entry[key]) || 0), 0);
    return {
      domContentLoadedMs: navigation
        ? Number(navigation.domContentLoadedEventEnd - navigation.startTime)
        : null,
      loadEventMs: navigation
        ? Number(navigation.loadEventEnd - navigation.startTime)
        : null,
      resourceCount: resources.length,
      transferBytes: sum('transferSize'),
      encodedBytes: sum('encodedBodySize'),
    };
  });

const chooseOption = async (page, index, label) => {
  await page.getByRole('combobox').nth(index).click();
  await page.getByRole('option', { name: label, exact: true }).click();
};

const runCatalogAction = async (page, steps) => {
  const actionStarted = now();
  await page.locator('input[name="search"]').fill(productName);
  steps.push({ action: 'pesquisar fixture sintética', completed: false });
  await page.getByText(productName, { exact: true }).waitFor();
  steps.at(-1).completed = true;
  return now() - actionStarted;
};

const runLoanAction = async (page, steps) => {
  const actionStarted = now();
  const perform = async (label, action) => {
    const step = { action: label, completed: false };
    steps.push(step);
    await action();
    step.completed = true;
  };

  await perform('selecionar usuário sintético', () =>
    chooseOption(page, 0, borrowerName),
  );
  await perform('selecionar grupo Outro', () => chooseOption(page, 1, 'Outro'));
  await perform('selecionar produto sintético', () =>
    chooseOption(page, 2, productName),
  );
  await perform('informar quantidade 1', () =>
    page.locator('input[name="quantity"]').fill('1'),
  );
  await perform('selecionar unidade Unidade', () =>
    chooseOption(page, 3, 'Unidade'),
  );
  await perform('adicionar produto à solicitação', async () => {
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.getByText(productName, { exact: true }).waitFor();
  });

  const requestPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/emprestimos\/?$/i.test(new URL(response.url()).pathname),
    { timeout: 20_000 },
  );
  const requestStep = { action: 'solicitar empréstimo', completed: false };
  steps.push(requestStep);
  await page.getByRole('button', { name: 'Solicitar Empréstimo' }).click();
  const response = await requestPromise;
  const apiStatus = response.status();
  if (apiStatus < 200 || apiStatus >= 300) {
    throw new Error(`POST de criação respondeu HTTP ${apiStatus}`);
  }
  await page
    .getByText('Solicitação de empréstimo bem sucessida!', { exact: true })
    .waitFor();
  requestStep.completed = true;
  return { actionMs: now() - actionStarted, apiStatus };
};

const clearTimingEntries = (page) =>
  page.evaluate(() => performance.clearResourceTimings());

const run = async (browser, definition, index) => {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);

  if (definition.name !== 'login-administrador') {
    await authenticate(page, definition.role);
    await clearTimingEntries(page);
  }

  const observed = installObservability(page);
  const started = now();
  const steps = [];
  let navigationMs = null;
  let readyMs = null;
  let actionMs = null;
  let responseStatus = null;
  let actionResponseStatus = null;
  let error = null;
  let helpAffordancesVisible = null;

  try {
    const navigationStarted = now();
    const response = await page.goto(
      new URL(definition.path, baseURL).toString(),
      { waitUntil: 'domcontentloaded' },
    );
    responseStatus = response?.status() ?? null;
    navigationMs = now() - navigationStarted;

    if (definition.name === 'login-administrador') {
      await page.getByRole('button', { name: 'Submeter Login' }).waitFor();
    } else if (definition.name === 'inicio-administrador') {
      await page.getByRole('heading', { name: 'Home' }).waitFor();
      await page
        .getByRole('status')
        .filter({ hasText: 'Carregando dados da home' })
        .waitFor({ state: 'hidden' });
    } else if (definition.name === 'catalogo-administrador') {
      await page
        .getByRole('heading', { name: /Pesquisa - Administrador/ })
        .waitFor();
      await page.getByRole('list', { name: 'Produtos' }).waitFor();
    } else {
      await page
        .getByRole('heading', { name: /Cria.*Empr/ })
        .waitFor();
      await page.getByRole('combobox').nth(3).waitFor();
      await page.getByText('Produtos', { exact: true }).waitFor();
    }
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
    readyMs = now() - started;

    const helpLocators = page.locator('a,button').filter({
      hasText: /ajuda|help|suporte/i,
    });
    helpAffordancesVisible = await helpLocators.count();

    if (definition.name === 'login-administrador') {
      const actionStarted = now();
      steps.push({ action: 'preencher email sintético', completed: false });
      await page.locator('input[name="email"]').fill(credentials.Administrador.email);
      steps.at(-1).completed = true;
      steps.push({ action: 'preencher senha sintética', completed: false });
      await page
        .locator('input[name="password"]')
        .fill(credentials.Administrador.password);
      steps.at(-1).completed = true;
      steps.push({ action: 'submeter login', completed: false });
      await page.getByRole('button', { name: 'Submeter Login' }).click();
      await page.waitForURL(/\/admin\/?$/, { timeout: 20_000 });
      await page.getByRole('heading', { name: 'Home' }).waitFor();
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
      steps.at(-1).completed = true;
      actionMs = now() - actionStarted;
    } else if (definition.name === 'inicio-administrador') {
      steps.push({ action: 'abrir início após autenticação', completed: true });
      actionMs = readyMs;
    } else if (definition.name === 'catalogo-administrador') {
      actionMs = await runCatalogAction(page, steps);
    } else {
      const loanResult = await runLoanAction(page, steps);
      actionMs = loanResult.actionMs;
      actionResponseStatus = loanResult.apiStatus;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const pageMetrics = await resourceMetrics(page).catch(() => null);
  const result = {
    scenario: definition.name,
    run: index,
    path: definition.path,
    role: definition.role,
    viewport,
    ok: error === null,
    navigationMs,
    readyMs,
    actionMs,
    responseStatus,
    actionResponseStatus,
    steps,
    completedSteps: steps.filter((step) => step.completed).length,
    help: {
      visibleInAppAffordances: helpAffordancesVisible,
      humanAssistanceObserved: null,
      note: 'execução automatizada; assistência humana não foi instrumentada',
    },
    pageMetrics,
    responseCount: observed.responseCount,
    apiResponseCount: observed.apiResponseCount,
    responseBytesByHeader: observed.responseBytesByHeader,
    unknownLengthResponses: observed.unknownLengthResponses,
    blockers: {
      httpErrors: unique(observed.httpErrors.map((item) => `${item.status} ${item.pathname}`)),
      apiStatuses: observed.apiStatuses,
      requestFailures: observed.requestFailures,
      consoleErrors: unique(observed.consoleErrors),
      pageErrors: unique(observed.pageErrors),
    },
    error,
  };
  await context.close().catch(() => undefined);
  console.log(
    JSON.stringify({
      type: 'run',
      scenario: result.scenario,
      run: result.run,
      ok: result.ok,
      navigationMs: result.navigationMs,
      readyMs: result.readyMs,
      actionMs: result.actionMs,
      transferBytes: result.pageMetrics?.transferBytes ?? null,
      completedSteps: result.completedSteps,
      stepCount: result.steps.length,
      responseStatus: result.responseStatus,
      actionResponseStatus: result.actionResponseStatus,
      httpErrorCount: result.blockers.httpErrors.length,
      requestFailureCount: result.blockers.requestFailures.length,
      consoleErrorCount: result.blockers.consoleErrors.length,
      pageErrorCount: result.blockers.pageErrors.length,
      error: result.error,
    }),
  );
  return result;
};

const browser = await chromium.launch({ headless: true });
const output = {
  generatedAt: new Date().toISOString(),
  baselineCommit,
  baseURL,
  scenario,
  fixture: { productName, borrowerName, quantity: 1 },
  buildIdentity,
  viewport,
  iterations,
  browserVersion: browser.version(),
  cacheProtocol:
    'context novo por repetição; login de preparação executado para cenários autenticados; rota medida em navegação direta com o cache da sessão aquecido pelo login; service workers bloqueados',
  scenarios: [],
};

for (const definition of scenarios) {
  const runs = [];
  for (let index = 1; index <= iterations; index += 1) {
    runs.push(await run(browser, definition, index));
  }
  output.scenarios.push({
    name: definition.name,
    path: definition.path,
    role: definition.role,
    runs,
    successfulRuns: runs.filter((runResult) => runResult.ok).length,
    medians: {
      navigationMs: median(runs.map((runResult) => runResult.navigationMs)),
      readyMs: median(runs.map((runResult) => runResult.readyMs)),
      actionMs: median(runs.map((runResult) => runResult.actionMs)),
      transferBytes: median(
        runs.map((runResult) => runResult.pageMetrics?.transferBytes),
      ),
      encodedBytes: median(
        runs.map((runResult) => runResult.pageMetrics?.encodedBytes),
      ),
      responseBytesByHeader: median(
        runs.map((runResult) => runResult.responseBytesByHeader),
      ),
    },
  });
}

await browser.close();
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify({
    type: 'aggregate-written',
    outputPath: String(outputPath),
    baselineCommit,
    buildIdentity,
    generatedAt: output.generatedAt,
    scenarios: output.scenarios.map((item) => ({
      name: item.name,
      successfulRuns: item.successfulRuns,
      medians: item.medians,
    })),
  }),
);
