import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

import { scenarioData, seedE2eScenario } from '../infra/e2e-data';

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

type CatalogProduct = {
  id: number;
  nomeProduto: string;
  dataValidade: string | null;
  motivosAlerta: string[];
};

type CatalogPage = {
  itens: CatalogProduct[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
};

const validityReason = 'validade';

const civilDate = (instant: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const shiftCivilDate = (value: string, days: number): string => {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-');
};

const formatDisplayDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const sessionCookieHeader = (sessionCookie: string) => ({
  Cookie: `lab_solos_session=${sessionCookie}`,
});

const isProductCreationResponse = (
  response: { url(): string; request(): { method(): string } },
  apiUrl: string
) =>
  response.url().toLowerCase() === `${apiUrl}/produtos`.toLowerCase() &&
  response.request().method() === 'POST';

const loginInBrowser = async (
  page: Page,
  apiUrl: string,
  credentials: { email: string; password: string }
): Promise<BrowserSession> => {
  await page.goto('/');
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().toLowerCase() === `${apiUrl}/Auth/login`.toLowerCase() &&
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
  await expect(page).toHaveURL(/\/admin\/?$/);

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

const selectManufactureDateByCalendar = async (
  page: Page,
  date: string
): Promise<void> => {
  const [year, month, day] = date.split('-').map(Number);
  const field = page.getByRole('textbox', { name: 'Data de Fabricação' });
  await page
    .getByRole('button', { name: 'Abrir calendário: Data de Fabricação' })
    .click();
  await page.getByRole('spinbutton', { name: 'Ano' }).fill(String(year));
  await page
    .getByRole('combobox', { name: 'Mês' })
    .selectOption(String(month - 1));
  await page
    .getByRole('grid')
    .getByRole('gridcell', { name: String(day), exact: true })
    .click();
  await expect(field).toHaveValue(formatDisplayDate(date));
};

const fillChemicalForm = async (
  page: Page,
  values: { name: string; manufactureDate: string; expiryDate: string }
): Promise<void> => {
  await page.locator('#nome').fill(values.name);
  await page.locator('#formula').fill('NaCl');
  await page.locator('#quantidade').fill('5');
  await page.locator('#minimo').fill('1');
  await page.getByRole('combobox', { name: 'Grupo' }).click();
  await page.getByRole('option', { name: 'Outros', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Selecione a unidade de medida' })
    .click();
  await page.getByRole('option', { name: 'Grama', exact: true }).click();
  await selectManufactureDateByCalendar(page, values.manufactureDate);
  await page
    .getByRole('textbox', { name: 'Data de Validade' })
    .fill(formatDisplayDate(values.expiryDate));
};

const adminCatalog = async (
  request: APIRequestContext,
  apiUrl: string,
  sessionCookie: string
): Promise<CatalogProduct[]> => {
  const products: CatalogProduct[] = [];
  let pagina = 1;
  let totalPaginas: number;

  do {
    const response = await request.get(
      `${apiUrl}/Produtos/catalogo-administrativo?pagina=${pagina}&tamanhoPagina=100`,
      { headers: sessionCookieHeader(sessionCookie) }
    );
    expect(response.status(), await response.text()).toBe(200);
    const catalog = (await response.json()) as CatalogPage;
    expect(catalog.pagina).toBe(pagina);
    expect(catalog.itens).toEqual(expect.any(Array));
    products.push(...catalog.itens);
    totalPaginas = catalog.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return products;
};

const productsByName = (
  catalog: CatalogProduct[],
  name: string
): CatalogProduct[] =>
  catalog.filter((product) => product.nomeProduto === name);

const expectVisibleProductOnce = async (page: Page, name: string) => {
  await page.goto('/admin/search-material');
  await page.getByRole('textbox', { name: 'Pesquisar' }).fill(name);
  const row = page
    .getByRole('list', { name: 'Produtos', exact: true })
    .getByRole('listitem')
    .filter({ hasText: name });
  await expect(row).toHaveCount(1);
  return row;
};

test.describe('cadastro e alerta por dia civil — T012', () => {
  test.setTimeout(240_000);

  test('respeita o dia de São Paulo com navegadores em fusos diferentes', async ({
    browser,
    request,
  }) => {
    const scenario = `product-expiry-t012-${process.pid}-${Date.now()}`;
    const data = scenarioData(scenario);
    await seedE2eScenario(scenario);

    const today = civilDate(new Date(), 'America/Sao_Paulo');
    const yesterday = shiftCivilDate(today, -1);
    const manufactureDate = shiftCivilDate(today, -30);
    // 00:30 in São Paulo is the previous civil day in Honolulu and the current
    // civil day in Kiritimati. Both pages receive the same instant.
    const controlledInstant = new Date(`${today}T03:30:00.000Z`);
    expect(civilDate(controlledInstant, 'Pacific/Honolulu')).not.toBe(
      civilDate(controlledInstant, 'Pacific/Kiritimati')
    );

    const expiredCancelledName = `${scenario} vencido cancelado`;
    const expiredConfirmedName = `${scenario} vencido confirmado`;
    const dueTodayName = `${scenario} vence hoje`;

    const honoluluContext = await browser.newContext({
      timezoneId: 'Pacific/Honolulu',
    });
    try {
      const honoluluPage = await honoluluContext.newPage();
      await honoluluPage.clock.setFixedTime(controlledInstant);
      const login = await loginInBrowser(
        honoluluPage,
        data.apiUrl,
        data.administrator
      );
      await honoluluPage.goto('/admin/insert');
      await fillChemicalForm(honoluluPage, {
        name: expiredCancelledName,
        manufactureDate,
        expiryDate: yesterday,
      });

      const cancelledAttempt = honoluluPage.waitForResponse((response) =>
        isProductCreationResponse(response, data.apiUrl)
      );
      await honoluluPage.getByRole('button', { name: 'Adicionar' }).click();
      const cancelledAttemptResponse = await cancelledAttempt;
      expect(cancelledAttemptResponse.status()).not.toBe(201);

      const expiredDialog = honoluluPage.getByRole('alertdialog', {
        name: 'Produto vencido',
      });
      await expect(expiredDialog).toContainText(formatDisplayDate(yesterday));
      await expect(expiredDialog).toContainText(formatDisplayDate(today));
      const cancelButton = expiredDialog.getByRole('button', {
        name: 'Cancelar',
      });
      await expect(cancelButton).toBeFocused();
      await honoluluPage.keyboard.press('Enter');
      await expect(expiredDialog).toHaveCount(0);
      await expect(
        honoluluPage.getByRole('button', { name: 'Adicionar' })
      ).toBeFocused();
      await expect(honoluluPage.locator('#nome')).toHaveValue(
        expiredCancelledName
      );
      expect(
        productsByName(
          await adminCatalog(request, data.apiUrl, login.sessionCookie),
          expiredCancelledName
        )
      ).toHaveLength(0);
    } finally {
      await honoluluContext.close();
    }

    const kiritimatiContext = await browser.newContext({
      timezoneId: 'Pacific/Kiritimati',
    });
    try {
      const kiritimatiPage = await kiritimatiContext.newPage();
      await kiritimatiPage.clock.setFixedTime(controlledInstant);
      const login = await loginInBrowser(
        kiritimatiPage,
        data.apiUrl,
        data.administrator
      );
      await kiritimatiPage.goto('/admin/insert');
      await fillChemicalForm(kiritimatiPage, {
        name: expiredConfirmedName,
        manufactureDate,
        expiryDate: yesterday,
      });

      const initialReview = kiritimatiPage.waitForResponse((response) =>
        isProductCreationResponse(response, data.apiUrl)
      );
      await kiritimatiPage.getByRole('button', { name: 'Adicionar' }).click();
      expect((await initialReview).status()).not.toBe(201);
      const expiredDialog = kiritimatiPage.getByRole('alertdialog', {
        name: 'Produto vencido',
      });
      await expect(expiredDialog).toBeVisible();
      const cancelButton = expiredDialog.getByRole('button', {
        name: 'Cancelar',
      });
      await expect(cancelButton).toBeFocused();
      await kiritimatiPage.keyboard.press('Tab');
      const confirmButton = expiredDialog.getByRole('button', {
        name: 'Adicionar mesmo assim',
      });
      await expect(confirmButton).toBeFocused();

      const confirmedCreation = kiritimatiPage.waitForResponse(
        (response) =>
          isProductCreationResponse(response, data.apiUrl) &&
          response.status() === 201
      );
      await kiritimatiPage.keyboard.press('Enter');
      expect((await confirmedCreation).status()).toBe(201);
      await expect(expiredDialog).toHaveCount(0);

      const createdExpired = productsByName(
        await adminCatalog(request, data.apiUrl, login.sessionCookie),
        expiredConfirmedName
      );
      expect(createdExpired).toHaveLength(1);
      expect(createdExpired[0].dataValidade).toBe(yesterday);
      expect(createdExpired[0].motivosAlerta).toContain(validityReason);

      await expectVisibleProductOnce(kiritimatiPage, expiredConfirmedName);

      await kiritimatiPage.goto('/admin/follow-up');
      await kiritimatiPage
        .getByRole('textbox', { name: 'Pesquisar' })
        .fill(scenario);
      const alertList = kiritimatiPage.getByRole('list', {
        name: 'Produtos em alerta',
        exact: true,
      });
      await expect(
        alertList
          .getByRole('listitem')
          .filter({ hasText: expiredConfirmedName })
      ).toHaveCount(1);

      await kiritimatiPage.goto('/admin/insert');
      await fillChemicalForm(kiritimatiPage, {
        name: dueTodayName,
        manufactureDate,
        expiryDate: today,
      });
      const dueTodayCreation = kiritimatiPage.waitForResponse(
        (response) =>
          isProductCreationResponse(response, data.apiUrl) &&
          response.status() === 201
      );
      await kiritimatiPage.getByRole('button', { name: 'Adicionar' }).click();
      expect((await dueTodayCreation).status()).toBe(201);
      await expect(
        kiritimatiPage.getByRole('alertdialog', { name: 'Produto vencido' })
      ).toHaveCount(0);

      const createdToday = productsByName(
        await adminCatalog(request, data.apiUrl, login.sessionCookie),
        dueTodayName
      );
      expect(createdToday).toHaveLength(1);
      expect(createdToday[0].dataValidade).toBe(today);
      expect(createdToday[0].motivosAlerta).toContain(validityReason);

      await kiritimatiPage.goto('/admin/follow-up');
      await kiritimatiPage
        .getByRole('textbox', { name: 'Pesquisar' })
        .fill(scenario);
      const alertListAfterToday = kiritimatiPage.getByRole('list', {
        name: 'Produtos em alerta',
        exact: true,
      });
      await expect(
        alertListAfterToday
          .getByRole('listitem')
          .filter({ hasText: expiredConfirmedName })
      ).toHaveCount(1);
      await expect(
        alertListAfterToday
          .getByRole('listitem')
          .filter({ hasText: dueTodayName })
      ).toHaveCount(1);
    } finally {
      await kiritimatiContext.close();
    }
  });
});
