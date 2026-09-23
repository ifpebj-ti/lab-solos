import { pathToFileURL } from 'node:url';

const { chromium } = await import(
  pathToFileURL(
    'C:/Users/Nathan/Documents/Labon/lab-solos/frontend/node_modules/@playwright/test/index.mjs',
  ).href,
);

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const scenario = process.env.E2E_SEED_SCENARIO ?? 't001-baseline';
const viewport = { width: 1440, height: 900 };
const iterations = 5;

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

const scenarios = [
  {
    name: 'login',
    role: 'Administrador',
    path: '/',
    ready: async (page) => {
      await page.getByRole('button', { name: 'Submeter Login' }).waitFor();
    },
    action: async (page) => {
      const started = performance.now();
      await page.locator('input[name="email"]').fill(credentials.Administrador.email);
      await page.locator('input[name="password"]').fill(credentials.Administrador.password);
      await page.getByRole('button', { name: 'Submeter Login' }).click();
      await page.waitForURL(/\/admin\/?$/, { timeout: 20_000 });
      await page.getByRole('heading', { name: 'Home' }).waitFor();
      return performance.now() - started;
    },
  },
  {
    name: 'inicio-administrador',
    role: 'Administrador',
    path: '/admin/',
    ready: async (page) => {
      await page.getByRole('heading', { name: 'Home' }).waitFor();
    },
  },
  {
    name: 'catalogo-administrador',
    role: 'Administrador',
    path: '/admin/search-material',
    ready: async (page) => {
      await page.getByRole('heading', { name: /Pesquisa - Administrador/ }).waitFor();
      await page.getByRole('list', { name: 'Produtos' }).waitFor();
    },
  },
  {
    name: 'criacao-mentor',
    role: 'Mentor',
    path: '/mentor/loan/creation',
    ready: async (page) => {
      await page.getByRole('heading', { name: /Cria.*Empr/ }).waitFor();
      await page.getByText('Produtos', { exact: true }).waitFor();
    },
  },
];

const now = () => Number(process.hrtime.bigint()) / 1_000_000;

const resourceMetrics = async (page) =>
  page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const transferBytes = [navigation, ...resources].reduce(
      (total, entry) => total + (Number(entry.transferSize) || 0),
      0
    );
    const encodedBytes = [navigation, ...resources].reduce(
      (total, entry) => total + (Number(entry.encodedBodySize) || 0),
      0
    );
    return {
      domContentLoadedMs: navigation
        ? Number(navigation.domContentLoadedEventEnd - navigation.startTime)
        : null,
      loadEventMs: navigation
        ? Number(navigation.loadEventEnd - navigation.startTime)
        : null,
      resourceCount: resources.length,
      transferBytes,
      encodedBytes,
    };
  });

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
      const pathname = new URL(url).pathname;
      observed.httpErrors.push({ status, pathname });
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

const median = (values) => {
  const numbers = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 0
    ? (numbers[middle - 1] + numbers[middle]) / 2
    : numbers[middle];
};

const unique = (values) => [...new Set(values)];

const run = async (browser, definition, index) => {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);
  const observed = installObservability(page);
  const started = now();
  let navigationMs = null;
  let readyMs = null;
  let actionMs = null;
  let responseStatus = null;
  let error = null;
  try {
    const navigationStarted = now();
    const response = await page.goto(new URL(definition.path, baseURL).toString(), {
      waitUntil: 'domcontentloaded',
    });
    navigationMs = now() - navigationStarted;
    responseStatus = response?.status() ?? null;
    await definition.ready(page);
    readyMs = now() - started;
    if (definition.action) actionMs = await definition.action(page);
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
  await context.close();
  return result;
};

const browser = await chromium.launch({ headless: true });
const output = {
  generatedAt: new Date().toISOString(),
  baseURL,
  scenario,
  viewport,
  iterations,
  browserVersion: browser.version(),
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
    medians: {
      navigationMs: median(runs.map((runResult) => runResult.navigationMs)),
      readyMs: median(runs.map((runResult) => runResult.readyMs)),
      actionMs: median(runs.map((runResult) => runResult.actionMs)),
      transferBytes: median(
        runs.map((runResult) => runResult.pageMetrics?.transferBytes)
      ),
      encodedBytes: median(
        runs.map((runResult) => runResult.pageMetrics?.encodedBytes)
      ),
      responseBytesByHeader: median(
        runs.map((runResult) => runResult.responseBytesByHeader)
      ),
    },
    successfulRuns: runs.filter((runResult) => runResult.ok).length,
  });
}

await browser.close();
console.log(JSON.stringify(output, null, 2));
