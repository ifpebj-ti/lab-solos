import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

import { scenarioData, seedE2eScenario } from '../infra/e2e-data';

const execFileAsync = promisify(execFile);
const validityReason = 'validade';
const stockReason = 'estoque_abaixo_minimo';

type LoginResponse = {
  token: string;
  requiresPasswordChange: boolean;
};

type BrowserLoginResponse = {
  requiresPasswordChange: boolean;
};

type BrowserSession = {
  sessionCookie: string;
  userId: number;
  role: string;
  requiresPasswordChange: boolean;
  csrfToken: string;
};

type ProductAlertReason = typeof validityReason | typeof stockReason;

type AdminProduct = {
  id: number;
  nomeProduto: string;
  tipoProduto: string;
  quantidade: number;
  quantidadeMinima: number;
  unidadeMedida: string | null;
  dataValidade: string | null;
  capacidadeMl: number | null;
  motivosAlerta: ProductAlertReason[];
};

type PaginatedAdminCatalog = {
  itens: AdminProduct[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
};

type ProductInput = {
  nomeProduto: string;
  tipo: 'Outro' | 'Vidraria' | 'Quimico';
  quantidade: number;
  quantidadeMinima: number;
  unidadeMedida: string;
  dataValidade?: string;
  capacidade?: number;
  material?: string;
  formato?: string;
  altura?: string;
  graduada?: boolean;
  formulaQuimica?: string;
  grupo?: string;
};

const bearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const sessionCookieHeader = (sessionCookie: string) => ({
  Cookie: `lab_solos_session=${sessionCookie}`,
});

const saoPauloCivilDate = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const shiftCivilDate = (civilDate: string, days: number): string => {
  const [year, month, day] = civilDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-');
};

const loginInBrowser = async (
  page: Page,
  apiUrl: string,
  credentials: { email: string; password: string },
  expectedPath: RegExp
): Promise<BrowserSession> => {
  await page.goto('/');
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/Auth/login` &&
      response.request().method() === 'POST'
  );

  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Submeter Login' }).click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const login = (await response.json()) as BrowserLoginResponse;
  expect(login).not.toHaveProperty('token');
  expect(login.requiresPasswordChange).toBe(false);
  await expect(page).toHaveURL(expectedPath);

  const sessionResponse = await page.evaluate(async (sessionApiUrl) => {
    const result = await fetch(`${sessionApiUrl}/Auth/session`, {
      credentials: 'include',
    });
    return { status: result.status, session: await result.json() };
  }, apiUrl);
  expect(sessionResponse.status).toBe(200);
  const session = sessionResponse.session as Omit<
    BrowserSession,
    'sessionCookie'
  >;
  expect(session.userId).toEqual(expect.any(Number));
  expect(session.role).toEqual(expect.any(String));
  expect(session.requiresPasswordChange).toBe(false);
  expect(session.csrfToken).toEqual(expect.any(String));

  const sessionCookie = (await page.context().cookies(apiUrl)).find(
    (cookie) => cookie.name === 'lab_solos_session'
  )?.value;
  if (!sessionCookie) {
    throw new Error('The browser did not retain its HttpOnly session cookie.');
  }

  const storedCsrfToken = await page.evaluate(() =>
    sessionStorage.getItem('auth:csrf-token')
  );
  expect(storedCsrfToken).toBe(session.csrfToken);

  return { ...session, sessionCookie };
};

const createProduct = async (
  request: APIRequestContext,
  apiUrl: string,
  token: string,
  product: ProductInput
): Promise<number> => {
  const response = await request.post(`${apiUrl}/Produtos`, {
    headers: bearer(token),
    data: product,
  });
  expect(response.status(), await response.text()).toBe(201);
  const created = (await response.json()) as { id: number };
  expect(Number.isInteger(created.id)).toBe(true);
  return created.id;
};

const clearGlasswareCapacity = async (
  composeProject: string,
  productId: number
): Promise<void> => {
  const repositoryRoot = path.resolve(process.cwd(), '..');
  const composeFile = path.join(repositoryRoot, 'docker-compose-e2e.yml');
  const result = await execFileAsync(
    'docker',
    [
      'compose',
      '--project-name',
      composeProject,
      '--file',
      composeFile,
      'exec',
      '-T',
      'db',
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'lab_solos_e2e',
      '-d',
      'lab_solos_e2e',
      '-c',
      `UPDATE "Produtos" SET "Capacidade" = NULL WHERE "Id" = ${productId};`,
    ],
    { cwd: repositoryRoot, maxBuffer: 1024 * 1024 }
  );
  expect(result.stdout).toContain('UPDATE 1');
};

const openMobileNavigationLink = async (page: Page, label: string) => {
  await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
  const link = page.getByRole('link', { name: label, exact: true });
  if (!(await link.isVisible())) {
    await page.getByRole('button', { name: 'Produtos', exact: true }).click();
  }
  await link.click();
};

const expectMobileViewport = async (page: Page) => {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
};

const expectCatalogSummary = async (
  page: Page,
  name: string,
  expectedSummary: string
) => {
  const search = page.getByRole('textbox', { name: 'Pesquisar' });
  await search.fill(name);
  const row = page
    .getByRole('list', { name: 'Produtos', exact: true })
    .getByRole('listitem')
    .filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(row.locator('dd').nth(6)).toHaveText(expectedSummary);
  return row;
};

const expectAlertCard = async (
  page: Page,
  title: string,
  expectedCount: number
) => {
  const card = page
    .getByRole('article')
    .filter({ has: page.getByText(title, { exact: true }) });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(`+${expectedCount}`);
};

test.describe('alertas de produtos reais — T009', () => {
  test.setTimeout(180_000);

  test('classifica o inventário em Meus Produtos e Alertas e restringe acesso no celular', async ({
    browser,
    page,
    request,
  }) => {
    const scenario = `alerts-t009-${process.pid}-${Date.now()}`;
    const data = scenarioData(scenario);
    const prefix = `T009 ${scenario}`;
    const today = saoPauloCivilDate();
    await seedE2eScenario(scenario);

    const adminLoginResponse = await request.post(`${data.apiUrl}/Auth/login`, {
      data: data.administrator,
    });
    expect(adminLoginResponse.status()).toBe(200);
    const adminCredentials = (await adminLoginResponse.json()) as LoginResponse;
    const adminToken = adminCredentials.token;

    const productNames = {
      both: `${prefix} ambos motivos`,
      stockOnly: `${prefix} somente estoque`,
      expired: `${prefix} validade passada`,
      validToday: `${prefix} vence hoje`,
      validDayTen: `${prefix} vence em dez dias`,
      validDayEleven: `${prefix} vence em onze dias`,
      noValidity: `${prefix} sem validade`,
      stockEqual: `${prefix} estoque igual ao mínimo`,
      stockAbove: `${prefix} estoque acima do mínimo`,
      glassOne: `${prefix} béquer`,
      glassFour: `${prefix} proveta`,
      glassWithoutCapacity: `${prefix} pipeta sem capacidade`,
      chemicalLitres: `${prefix} químico em litros`,
    };

    const add = async (
      key: keyof typeof productNames,
      product: Omit<ProductInput, 'nomeProduto'>
    ) => {
      await createProduct(request, data.apiUrl, adminToken, {
        ...product,
        nomeProduto: productNames[key],
      });
    };

    await add('both', {
      tipo: 'Outro',
      quantidade: 1,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
      dataValidade: shiftCivilDate(today, 10),
    });
    await add('stockOnly', {
      tipo: 'Outro',
      quantidade: 1,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
    });
    await add('expired', {
      tipo: 'Outro',
      quantidade: 8,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
      dataValidade: shiftCivilDate(today, -1),
    });
    await add('validToday', {
      tipo: 'Outro',
      quantidade: 8,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
      dataValidade: today,
    });
    await add('validDayTen', {
      tipo: 'Outro',
      quantidade: 8,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
      dataValidade: shiftCivilDate(today, 10),
    });
    await add('validDayEleven', {
      tipo: 'Outro',
      quantidade: 8,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
      dataValidade: shiftCivilDate(today, 11),
    });
    await add('noValidity', {
      tipo: 'Outro',
      quantidade: 8,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
    });
    await add('stockEqual', {
      tipo: 'Outro',
      quantidade: 2,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
    });
    await add('stockAbove', {
      tipo: 'Outro',
      quantidade: 3,
      quantidadeMinima: 2,
      unidadeMedida: 'Unidade',
    });
    await add('glassOne', {
      tipo: 'Vidraria',
      quantidade: 1,
      quantidadeMinima: 1,
      unidadeMedida: 'Unidade',
      capacidade: 250,
      material: 'VidroBorossilicato',
      formato: 'Cilindrica',
      altura: 'Baixa',
      graduada: true,
    });
    await add('glassFour', {
      tipo: 'Vidraria',
      quantidade: 4,
      quantidadeMinima: 1,
      unidadeMedida: 'Unidade',
      capacidade: 500,
      material: 'VidroBorossilicato',
      formato: 'Cilindrica',
      altura: 'Intermediaria',
      graduada: true,
    });
    const missingCapacityId = await createProduct(
      request,
      data.apiUrl,
      adminToken,
      {
        nomeProduto: productNames.glassWithoutCapacity,
        tipo: 'Vidraria',
        quantidade: 1,
        quantidadeMinima: 1,
        unidadeMedida: 'Unidade',
        capacidade: 100,
        material: 'VidroBorossilicato',
        formato: 'Pipeta',
        altura: 'Baixa',
        graduada: true,
      }
    );
    await clearGlasswareCapacity(data.composeProject, missingCapacityId);
    await add('chemicalLitres', {
      tipo: 'Quimico',
      quantidade: 4,
      quantidadeMinima: 2,
      unidadeMedida: 'Litro',
      dataValidade: shiftCivilDate(today, 30),
      formulaQuimica: 'H2O',
      grupo: 'Outros',
    });

    const pageSize = 100;
    const firstCatalogPageResponse = await request.get(
      `${data.apiUrl}/Produtos/catalogo-administrativo?pagina=1&tamanhoPagina=${pageSize}`,
      { headers: bearer(adminToken) }
    );
    expect(firstCatalogPageResponse.status()).toBe(200);
    const firstCatalogPage =
      (await firstCatalogPageResponse.json()) as PaginatedAdminCatalog;
    expect(firstCatalogPage).toMatchObject({
      pagina: 1,
      tamanhoPagina: pageSize,
    });
    const catalog = [...firstCatalogPage.itens];
    for (let pagina = 2; pagina <= firstCatalogPage.totalPaginas; pagina += 1) {
      const catalogPageResponse = await request.get(
        `${data.apiUrl}/Produtos/catalogo-administrativo?pagina=${pagina}&tamanhoPagina=${pageSize}`,
        { headers: bearer(adminToken) }
      );
      expect(catalogPageResponse.status()).toBe(200);
      const catalogPage =
        (await catalogPageResponse.json()) as PaginatedAdminCatalog;
      expect(catalogPage).toMatchObject({
        pagina,
        tamanhoPagina: pageSize,
        totalItens: firstCatalogPage.totalItens,
        totalPaginas: firstCatalogPage.totalPaginas,
      });
      catalog.push(...catalogPage.itens);
    }
    expect(catalog).toHaveLength(firstCatalogPage.totalItens);
    expect(new Set(catalog.map((product) => product.id)).size).toBe(
      catalog.length
    );
    const scenarioProducts = catalog.filter((product) =>
      product.nomeProduto.startsWith(prefix)
    );
    expect(scenarioProducts).toHaveLength(Object.keys(productNames).length);

    const expectedReasons: Record<string, ProductAlertReason[]> = {
      [productNames.both]: [stockReason, validityReason],
      [productNames.stockOnly]: [stockReason],
      [productNames.expired]: [validityReason],
      [productNames.validToday]: [validityReason],
      [productNames.validDayTen]: [validityReason],
      [productNames.validDayEleven]: [],
      [productNames.noValidity]: [],
      [productNames.stockEqual]: [],
      [productNames.stockAbove]: [],
      [productNames.glassOne]: [],
      [productNames.glassFour]: [],
      [productNames.glassWithoutCapacity]: [],
      [productNames.chemicalLitres]: [],
    };
    for (const product of scenarioProducts) {
      expect(product.motivosAlerta).toEqual(
        expectedReasons[product.nomeProduto]
      );
    }
    expect(
      scenarioProducts.find(
        (product) => product.nomeProduto === productNames.glassWithoutCapacity
      )?.capacidadeMl
    ).toBeNull();

    const expectedTotals = {
      all: catalog.filter((product) => product.motivosAlerta.length > 0).length,
      validity: catalog.filter((product) =>
        product.motivosAlerta.includes(validityReason)
      ).length,
      stock: catalog.filter((product) =>
        product.motivosAlerta.includes(stockReason)
      ).length,
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await loginInBrowser(page, data.apiUrl, data.administrator, /\/admin\/?$/);
    await openMobileNavigationLink(page, 'Meus Produtos');
    await expect(page).toHaveURL(/\/admin\/search-material$/);
    await expect(
      page.getByRole('heading', { name: 'Pesquisa - Administrador' })
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Alertas de produtos' })
    ).toBeVisible();
    await expectMobileViewport(page);

    await expectCatalogSummary(
      page,
      productNames.both,
      'Estoque abaixo do mínimo; Validade'
    );
    await expectCatalogSummary(
      page,
      productNames.stockOnly,
      'Estoque abaixo do mínimo'
    );
    await expectCatalogSummary(page, productNames.expired, 'Validade');
    await expectCatalogSummary(page, productNames.validToday, 'Validade');
    await expectCatalogSummary(page, productNames.validDayTen, 'Validade');
    await expectCatalogSummary(page, productNames.validDayEleven, 'Sem alerta');
    await expectCatalogSummary(page, productNames.noValidity, 'Sem alerta');
    await expectCatalogSummary(page, productNames.stockEqual, 'Sem alerta');
    await expectCatalogSummary(page, productNames.stockAbove, 'Sem alerta');

    const glassOneRow = await expectCatalogSummary(
      page,
      productNames.glassOne,
      'Sem alerta'
    );
    await expect(glassOneRow.locator('dd').nth(1)).toHaveText(
      `${productNames.glassOne} 250 ml`
    );
    await expect(glassOneRow.locator('dd').nth(3)).toHaveText('1');
    await expect(glassOneRow.locator('dd').nth(4)).toHaveText('unidade');

    const glassFourRow = await expectCatalogSummary(
      page,
      productNames.glassFour,
      'Sem alerta'
    );
    await expect(glassFourRow.locator('dd').nth(1)).toHaveText(
      `${productNames.glassFour} 500 ml`
    );
    await expect(glassFourRow.locator('dd').nth(3)).toHaveText('4');
    await expect(glassFourRow.locator('dd').nth(4)).toHaveText('unidades');

    const glassWithoutCapacityRow = await expectCatalogSummary(
      page,
      productNames.glassWithoutCapacity,
      'Sem alerta'
    );
    await expect(glassWithoutCapacityRow.locator('dd').nth(1)).toHaveText(
      productNames.glassWithoutCapacity
    );

    const chemicalRow = await expectCatalogSummary(
      page,
      productNames.chemicalLitres,
      'Sem alerta'
    );
    await expect(chemicalRow.locator('dd').nth(3)).toHaveText('4');
    await expect(chemicalRow.locator('dd').nth(4)).toHaveText('Litro');

    await openMobileNavigationLink(page, 'Alertas');
    await expect(page).toHaveURL(/\/admin\/follow-up$/);
    await expect(
      page.getByRole('heading', { name: 'Acompanhamento' })
    ).toBeVisible();
    await expectMobileViewport(page);
    await expectAlertCard(page, 'Produtos com Alertas', expectedTotals.all);
    await expectAlertCard(
      page,
      'Produtos com Alerta de Validade',
      expectedTotals.validity
    );
    await expectAlertCard(
      page,
      'Produtos com Alerta de Estoque',
      expectedTotals.stock
    );

    const alertList = page.getByRole('list', {
      name: 'Produtos em alerta',
      exact: true,
    });
    const alertSearch = page.getByRole('textbox', { name: 'Pesquisar' });
    await alertSearch.fill(prefix);
    await expect(alertList.getByRole('listitem')).toHaveCount(5);
    await expect(
      alertList.getByRole('listitem').filter({ hasText: productNames.both })
    ).toHaveCount(1);
    for (const name of [
      productNames.stockOnly,
      productNames.expired,
      productNames.validToday,
      productNames.validDayTen,
    ]) {
      await expect(
        alertList.getByRole('listitem').filter({ hasText: name })
      ).toHaveCount(1);
    }

    const filter = page.getByRole('combobox');
    await filter.click();
    await page.getByRole('option', { name: 'Validade', exact: true }).click();
    await expect(alertList.getByRole('listitem')).toHaveCount(4);
    await expect(
      alertList.getByRole('listitem').filter({ hasText: productNames.both })
    ).toHaveCount(1);
    await expect(
      alertList
        .getByRole('listitem')
        .filter({ hasText: productNames.stockOnly })
    ).toHaveCount(0);

    await filter.click();
    await page.getByRole('option', { name: 'Estoque', exact: true }).click();
    await expect(alertList.getByRole('listitem')).toHaveCount(2);
    await expect(
      alertList.getByRole('listitem').filter({ hasText: productNames.both })
    ).toHaveCount(1);
    await expect(
      alertList
        .getByRole('listitem')
        .filter({ hasText: productNames.stockOnly })
    ).toHaveCount(1);

    const mentorContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    try {
      const mentorPage = await mentorContext.newPage();
      const mentorLogin = await loginInBrowser(
        mentorPage,
        data.apiUrl,
        data.mentor,
        /\/mentor\/?$/
      );
      const deniedCatalog = await request.get(
        `${data.apiUrl}/Produtos/catalogo-administrativo`,
        { headers: sessionCookieHeader(mentorLogin.sessionCookie) }
      );
      expect(deniedCatalog.status()).toBe(403);
      expect(await deniedCatalog.text()).not.toContain(prefix);

      await mentorPage.goto('/admin/follow-up');
      await expect(mentorPage).toHaveURL(/\/admin\/follow-up$/);
      await expect(
        mentorPage.getByRole('heading', { name: 'Acesso negado' })
      ).toBeVisible();
      await expect(
        mentorPage.getByRole('link', { name: 'Alertas', exact: true })
      ).toHaveCount(0);
      await expect(mentorPage.getByText(prefix)).toHaveCount(0);
    } finally {
      await mentorContext.close();
    }
  });
});
