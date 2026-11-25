import { createHash } from 'node:crypto';

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Locator,
  type Page,
} from '@playwright/test';

import {
  scenarioData,
  seedE2eScenario,
  type E2eScenarioData,
  type ScenarioCredentials,
} from '../infra/e2e-data';

type LoginResponse = {
  requiresPasswordChange: boolean;
};

type BrowserSession = {
  sessionCookie: string;
  userId: number;
  role: string;
  csrfToken: string;
  requiresPasswordChange: boolean;
};

type BrowserApiResponse = {
  status: number;
  text: string;
};

type Product = {
  id: number;
  nomeProduto: string;
  quantidade: number;
  status: string | null;
};

type Loan = {
  id: number;
  status: string;
  dataPrevistaDevolucao: string | null;
  dataDevolucao: string | null;
  dataAprovacao: string | null;
  produtos: Array<{ produto: Product; quantidade: number }>;
  solicitante: { email: string; nomeCompleto: string } | null;
  aprovador: { email: string } | null;
};

type AuditRecord = {
  dataHoraUtc: string;
  acao: string;
  recurso: string;
  origem: string;
};

type AuditPage = {
  itens: AuditRecord[];
};

const loanQuantity = 2;
const loanDays = 5;
const initialStock = 100;
const approvedStock = initialStock - loanQuantity;

test.describe('empréstimos reais — CT-006, CT-007 e CT-008', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  const expectedProductName = (scenario: string) => {
    const token = createHash('sha256')
      .update(scenario)
      .digest('hex')
      .slice(0, 12);
    return `E2E Product ${token}`;
  };

  const sessionCookieHeader = (sessionCookie: string) => ({
    Cookie: `lab_solos_session=${sessionCookie}`,
  });

  const parseJson = <T>(response: BrowserApiResponse): T => {
    expect(response.text).not.toBe('');
    return JSON.parse(response.text) as T;
  };

  const browserApi = async (
    page: Page,
    method: string,
    url: string,
    data?: unknown
  ): Promise<BrowserApiResponse> =>
    page.evaluate(
      async ({ method: requestMethod, url: requestUrl, data: requestData }) => {
        const headers: Record<string, string> = {};
        if (requestData !== undefined) {
          headers['Content-Type'] = 'application/json';
        }

        const isMutation = !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(
          requestMethod.toUpperCase()
        );
        if (isMutation) {
          const csrfToken = sessionStorage.getItem('auth:csrf-token');
          if (!csrfToken) throw new Error('Browser CSRF proof is unavailable.');
          headers['X-CSRF-Token'] = csrfToken;
        }

        const response = await fetch(requestUrl, {
          method: requestMethod,
          credentials: 'include',
          headers,
          body:
            requestData === undefined ? undefined : JSON.stringify(requestData),
        });

        return {
          status: response.status,
          text: await response.text(),
        };
      },
      { method, url, data }
    );

  const loginInBrowser = async (
    page: Page,
    data: E2eScenarioData,
    credentials: ScenarioCredentials,
    expectedPath: RegExp
  ): Promise<BrowserSession> => {
    await page.goto('/');
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${data.apiUrl}/Auth/login` &&
        response.request().method() === 'POST'
    );

    await page.locator('input[name="email"]').fill(credentials.email);
    await page.locator('input[name="password"]').fill(credentials.password);
    await page.getByRole('button', { name: 'Submeter Login' }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const login = (await response.json()) as LoginResponse;
    expect(login).not.toHaveProperty('token');
    expect(login.requiresPasswordChange).toBe(false);
    await expect(page).toHaveURL(expectedPath);

    const sessionResponse = await page.evaluate(async (apiUrl) => {
      const result = await fetch(`${apiUrl}/Auth/session`, {
        credentials: 'include',
      });
      return { status: result.status, session: await result.json() };
    }, data.apiUrl);
    expect(sessionResponse.status).toBe(200);
    const session = sessionResponse.session as Omit<
      BrowserSession,
      'sessionCookie'
    >;
    expect(session.userId).toEqual(expect.any(Number));
    expect(session.role).toEqual(expect.any(String));
    expect(session.requiresPasswordChange).toBe(false);
    expect(session.csrfToken).toEqual(expect.any(String));

    const sessionCookie = (await page.context().cookies(data.apiUrl)).find(
      (cookie) => cookie.name === 'lab_solos_session'
    )?.value;
    if (!sessionCookie) {
      throw new Error(
        'The browser did not retain its HttpOnly session cookie.'
      );
    }

    const storedCsrfToken = await page.evaluate(() =>
      sessionStorage.getItem('auth:csrf-token')
    );
    expect(storedCsrfToken).toBe(session.csrfToken);

    return { ...session, sessionCookie };
  };

  const sessionUserId = (userId: number): number => {
    expect(Number.isSafeInteger(userId)).toBe(true);
    expect(userId).toBeGreaterThan(0);
    return userId;
  };

  const findProduct = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    sessionCookie: string
  ): Promise<Product> => {
    const headers = sessionCookieHeader(sessionCookie);
    const response = await request.get(`${data.apiUrl}/Produtos`, { headers });
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as
      | Product[]
      | {
          itens: Product[];
          tamanhoPagina: number;
          totalPaginas: number;
        };
    const products = Array.isArray(payload) ? [...payload] : [...payload.itens];

    if (!Array.isArray(payload)) {
      for (let page = 2; page <= payload.totalPaginas; page += 1) {
        const pageResponse = await request.get(
          `${data.apiUrl}/Produtos?pagina=${page}&tamanhoPagina=${payload.tamanhoPagina}`,
          { headers }
        );
        expect(pageResponse.status()).toBe(200);
        const pagePayload = (await pageResponse.json()) as {
          itens: Product[];
        };
        products.push(...pagePayload.itens);
      }
    }

    const matches = products.filter(
      (product) => product.nomeProduto === expectedProductName(data.scenario)
    );
    expect(matches).toHaveLength(1);
    return matches[0];
  };

  const getProduct = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    sessionCookie: string,
    productId: number
  ): Promise<Product> => {
    const response = await request.get(`${data.apiUrl}/Produtos/${productId}`, {
      headers: sessionCookieHeader(sessionCookie),
    });
    expect(response.status()).toBe(200);
    return (await response.json()) as Product;
  };

  const getLoan = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    sessionCookie: string,
    loanId: number
  ): Promise<Loan> => {
    const response = await request.get(`${data.apiUrl}/Emprestimos/${loanId}`, {
      headers: sessionCookieHeader(sessionCookie),
    });
    expect(response.status()).toBe(200);
    return (await response.json()) as Loan;
  };

  const getLoansForUser = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    sessionCookie: string,
    userId: number
  ): Promise<Loan[]> => {
    const response = await request.get(
      `${data.apiUrl}/Emprestimos/usuario/${userId}`,
      { headers: sessionCookieHeader(sessionCookie) }
    );
    expect(response.status()).toBe(200);
    return (await response.json()) as Loan[];
  };

  const getAllLoans = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    sessionCookie: string
  ): Promise<Loan[]> => {
    const response = await request.get(`${data.apiUrl}/Emprestimos`, {
      headers: sessionCookieHeader(sessionCookie),
    });
    expect(response.status()).toBe(200);
    return (await response.json()) as Loan[];
  };

  const expectProductQuantity = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    sessionCookie: string,
    productId: number,
    quantity: number
  ): Promise<void> => {
    expect(
      (await getProduct(request, data, sessionCookie, productId)).quantidade
    ).toBe(quantity);
  };

  const expectLoanStatus = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    sessionCookie: string,
    loanId: number,
    status: string
  ): Promise<void> => {
    expect((await getLoan(request, data, sessionCookie, loanId)).status).toBe(
      status
    );
  };

  const seedScenario = async (name: string): Promise<E2eScenarioData> => {
    const data = scenarioData(`t026-${name}`);
    await seedE2eScenario(data.scenario);
    return data;
  };

  const createLoan = async (
    page: Page,
    data: E2eScenarioData,
    productId: number,
    quantity = loanQuantity,
    expectedBorrowerEmail = data.borrower.email
  ): Promise<Loan> => {
    const response = await browserApi(
      page,
      'POST',
      `${data.apiUrl}/Emprestimos`,
      {
        diasParaDevolucao: loanDays,
        produtos: [{ produtoId: productId, quantidade: quantity }],
      }
    );
    expect(response.status).toBe(201);
    const loan = parseJson<Loan>(response);
    expect(loan.status).toBe('Pendente');
    expect(loan.solicitante?.email).toBe(expectedBorrowerEmail);
    expect(loan.produtos).toEqual([
      expect.objectContaining({ quantidade: quantity }),
    ]);
    return loan;
  };

  const openAdminPage = async (
    browser: Browser,
    data: E2eScenarioData
  ): Promise<{
    page: Page;
    close: () => Promise<void>;
    login: BrowserSession;
  }> => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = await loginInBrowser(
      page,
      data,
      data.administrator,
      /\/admin\/?$/
    );
    return { page, close: () => context.close(), login };
  };

  const decisions = {
    approve: {
      label: 'Aceitar',
      token: 'success',
      action: 'aprovar',
      status: 'Aprovado',
      key: 'Enter',
    },
    reject: {
      label: 'Rejeitar',
      token: 'danger',
      action: 'reprovar',
      status: 'Rejeitado',
      key: 'Space',
    },
  } as const;

  const expectDetailStatus = (page: Page, status: string) =>
    expect(
      page.getByRole('heading', { name: `Histórico de Empréstimo - ${status}` })
    ).toBeVisible();

  const openPendingLoan = async (page: Page, loan: Loan) => {
    if (!loan.solicitante) {
      throw new Error('A solicitação precisa identificar o solicitante.');
    }
    await page.goto('/admin/loans-request');
    await page
      .getByRole('textbox', { name: 'Pesquisar' })
      .fill(loan.solicitante.nomeCompleto);
    await page.locator(`a[href="/admin/history/loan?id=${loan.id}"]`).click();
    await expect(page).toHaveURL(`/admin/history/loan?id=${loan.id}`);
    await expectDetailStatus(page, 'Pendente');
  };

  const focusDecision = async (page: Page, button: Locator) => {
    await page.getByRole('textbox', { name: 'Pesquisar' }).focus();
    for (let tab = 0; tab < 8; tab += 1) {
      await page.keyboard.press('Tab');
      if (
        await button.evaluate((element) => element === document.activeElement)
      ) {
        break;
      }
    }
    await expect(button).toBeFocused();
  };

  const tokenColor = (page: Page, token: string) =>
    page.locator('html').evaluate((root, name) => {
      const channels = getComputedStyle(root)
        .getPropertyValue(`--color-${name}`)
        .trim();
      return `rgb(${channels.split(/\s+/).join(', ')})`;
    }, token);

  const luminance = (color: string) => {
    const [red, green, blue] = color
      .slice(4, -1)
      .split(', ')
      .map((value) => {
        const channel = Number(value) / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  const expectTextContrast = (foreground: string, background: string) => {
    const text = luminance(foreground);
    const surface = luminance(background);
    expect(
      (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05)
    ).toBeGreaterThanOrEqual(4.5);
  };

  const expectDecisionAppearance = async (page: Page) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        colorScheme
      );
      const canvasColor = await tokenColor(page, 'canvas');
      const inverseColor = await tokenColor(page, 'text-inverse');
      const focusColor = await tokenColor(page, 'focus');

      for (const { label, token } of Object.values(decisions)) {
        await page.mouse.move(0, 0);
        const button = page.getByRole('button', { name: label, exact: true });
        const decisionColor = await tokenColor(page, token);
        await expect(button).toHaveCSS('color', decisionColor);
        await expect(button).toHaveCSS('border-top-color', decisionColor);
        await expect(button).toHaveCSS('background-color', canvasColor);
        expectTextContrast(decisionColor, canvasColor);

        await button.hover();
        await expect(button).toHaveCSS('background-color', decisionColor);
        await expect(button).toHaveCSS('color', inverseColor);
        expectTextContrast(inverseColor, decisionColor);

        await page.mouse.move(0, 0);
        await focusDecision(page, button);
        await expect(button).toHaveCSS('outline-style', 'solid');
        await expect(button).toHaveCSS('outline-width', '2px');
        await expect(button).toHaveCSS('outline-color', focusColor);
      }
    }
  };

  const decideWithKeyboard = async (
    page: Page,
    data: E2eScenarioData,
    loan: Loan,
    { label, action, status, key }: (typeof decisions)[keyof typeof decisions]
  ) => {
    const button = page.getByRole('button', { name: label, exact: true });
    await focusDecision(page, button);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${data.apiUrl}/Emprestimos/${action}/${loan.id}` &&
        response.request().method() === 'PATCH'
    );
    await page.keyboard.press(key);
    expect((await responsePromise).status()).toBe(204);
    await expectDetailStatus(page, status);
    for (const { label: decisionLabel } of Object.values(decisions)) {
      await expect(
        page.getByRole('button', { name: decisionLabel, exact: true })
      ).toHaveCount(0);
    }
  };

  test('solicita, lista, aprova uma vez e preserva estoque no reprocessamento', async ({
    browser,
    page,
    request,
  }) => {
    const data = await seedScenario('approval');
    const borrowerLogin = await loginInBrowser(
      page,
      data,
      data.borrower,
      /\/mentee\/?$/
    );
    const borrowerId = sessionUserId(borrowerLogin.userId);
    const product = await findProduct(
      request,
      data,
      borrowerLogin.sessionCookie
    );
    expect(product.quantidade).toBe(initialStock);

    const created = await createLoan(page, data, product.id);
    const otherLoan = await createLoan(page, data, product.id);
    expect(otherLoan.id).not.toBe(created.id);
    const borrowerLoans = await getLoansForUser(
      request,
      data,
      borrowerLogin.sessionCookie,
      borrowerId
    );
    expect(borrowerLoans.filter((loan) => loan.id === created.id)).toHaveLength(
      1
    );
    expect(borrowerLoans.find((loan) => loan.id === created.id)?.status).toBe(
      'Pendente'
    );

    const admin = await openAdminPage(browser, data);
    try {
      const pendingLoans = await getAllLoans(
        request,
        data,
        admin.login.sessionCookie
      );
      const pending = pendingLoans.find((loan) => loan.id === created.id);
      expect(pending?.status).toBe('Pendente');
      expect(pending?.solicitante?.email).toBe(data.borrower.email);

      await openPendingLoan(admin.page, created);
      await expectDecisionAppearance(admin.page);
      await decideWithKeyboard(admin.page, data, created, decisions.approve);
      await expectLoanStatus(
        request,
        data,
        admin.login.sessionCookie,
        otherLoan.id,
        'Pendente'
      );

      const freshAdmin = await openAdminPage(browser, data);
      try {
        const approved = await getLoan(
          request,
          data,
          freshAdmin.login.sessionCookie,
          created.id
        );
        expect(approved.status).toBe('Aprovado');
        expect(approved.aprovador?.email).toBe(data.administrator.email);
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.sessionCookie,
          product.id,
          approvedStock
        );

        const duplicateDecision = await browserApi(
          freshAdmin.page,
          'PATCH',
          `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
          { aprovadorId: sessionUserId(freshAdmin.login.userId) }
        );
        expect(duplicateDecision.status).toBe(409);
        expect(JSON.parse(duplicateDecision.text)).toMatchObject({
          code: 'loan_decision_already_recorded',
        });

        await expectLoanStatus(
          request,
          data,
          freshAdmin.login.sessionCookie,
          created.id,
          'Aprovado'
        );
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.sessionCookie,
          product.id,
          approvedStock
        );
      } finally {
        await freshAdmin.close();
      }
    } finally {
      await admin.close();
    }
  });

  test('rejeita a solicitação sem baixar estoque e recusa nova decisão', async ({
    browser,
    page,
    request,
  }) => {
    const data = await seedScenario('rejection');
    const borrowerLogin = await loginInBrowser(
      page,
      data,
      data.borrower,
      /\/mentee\/?$/
    );
    const product = await findProduct(
      request,
      data,
      borrowerLogin.sessionCookie
    );
    const created = await createLoan(page, data, product.id);
    const admin = await openAdminPage(browser, data);

    try {
      const pending = (
        await getAllLoans(request, data, admin.login.sessionCookie)
      ).find((loan) => loan.id === created.id);
      expect(pending?.status).toBe('Pendente');

      await openPendingLoan(admin.page, created);
      await decideWithKeyboard(admin.page, data, created, decisions.reject);

      const freshAdmin = await openAdminPage(browser, data);
      try {
        const rejected = await getLoan(
          request,
          data,
          freshAdmin.login.sessionCookie,
          created.id
        );
        expect(rejected.status).toBe('Rejeitado');
        expect(rejected.aprovador?.email).toBe(data.administrator.email);
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.sessionCookie,
          product.id,
          initialStock
        );

        const duplicateDecision = await browserApi(
          freshAdmin.page,
          'PATCH',
          `${data.apiUrl}/Emprestimos/reprovar/${created.id}`,
          { aprovadorId: sessionUserId(freshAdmin.login.userId) }
        );
        expect(duplicateDecision.status).toBe(409);
        expect(JSON.parse(duplicateDecision.text)).toMatchObject({
          code: 'loan_decision_already_recorded',
        });
        await expectLoanStatus(
          request,
          data,
          freshAdmin.login.sessionCookie,
          created.id,
          'Rejeitado'
        );
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.sessionCookie,
          product.id,
          initialStock
        );
      } finally {
        await freshAdmin.close();
      }
    } finally {
      await admin.close();
    }
  });

  test('recusa aprovação por estoque insuficiente sem alteração persistida', async ({
    browser,
    page,
    request,
  }) => {
    const data = await seedScenario('insufficient-stock');
    const borrowerLogin = await loginInBrowser(
      page,
      data,
      data.borrower,
      /\/mentee\/?$/
    );
    const product = await findProduct(
      request,
      data,
      borrowerLogin.sessionCookie
    );
    const approvedFirst = await createLoan(page, data, product.id, 60);
    const created = await createLoan(page, data, product.id, 60);
    const admin = await openAdminPage(browser, data);

    try {
      await openPendingLoan(admin.page, approvedFirst);
      await decideWithKeyboard(
        admin.page,
        data,
        approvedFirst,
        decisions.approve
      );

      const failedApproval = await browserApi(
        admin.page,
        'PATCH',
        `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
        { aprovadorId: sessionUserId(admin.login.userId) }
      );
      expect(failedApproval.status).toBe(409);
      expect(JSON.parse(failedApproval.text)).toMatchObject({
        code: 'loan_insufficient_stock',
      });

      const freshAdmin = await openAdminPage(browser, data);
      try {
        const pending = await getLoan(
          request,
          data,
          freshAdmin.login.sessionCookie,
          created.id
        );
        expect(pending.status).toBe('Pendente');
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.sessionCookie,
          product.id,
          initialStock - approvedFirst.produtos[0].quantidade
        );

        const retry = await browserApi(
          freshAdmin.page,
          'PATCH',
          `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
          { aprovadorId: sessionUserId(freshAdmin.login.userId) }
        );
        expect(retry.status).toBe(409);
        expect(JSON.parse(retry.text)).toMatchObject({
          code: 'loan_insufficient_stock',
        });
        await expectLoanStatus(
          request,
          data,
          freshAdmin.login.sessionCookie,
          created.id,
          'Pendente'
        );
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.sessionCookie,
          product.id,
          initialStock - approvedFirst.produtos[0].quantidade
        );
      } finally {
        await freshAdmin.close();
      }
    } finally {
      await admin.close();
    }
  });

  test('impede criação administrativa e decisão por perfil proibido', async ({
    browser,
    page,
    request,
  }) => {
    const data = await seedScenario('authorization');
    const borrowerLogin = await loginInBrowser(
      page,
      data,
      data.borrower,
      /\/mentee\/?$/
    );
    const product = await findProduct(
      request,
      data,
      borrowerLogin.sessionCookie
    );
    const created = await createLoan(page, data, product.id);

    const anonymousCreationStatus = await page.evaluate(
      async ({ url, payload }) => {
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return response.status;
      },
      {
        url: `${data.apiUrl}/Emprestimos`,
        payload: {
          diasParaDevolucao: loanDays,
          produtos: [{ produtoId: product.id, quantidade: loanQuantity }],
        },
      }
    );
    expect(anonymousCreationStatus).toBe(401);

    const borrowerDecision = await browserApi(
      page,
      'PATCH',
      `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
      { aprovadorId: sessionUserId(borrowerLogin.userId) }
    );
    expect(borrowerDecision.status).toBe(403);

    const admin = await openAdminPage(browser, data);
    try {
      const adminCreation = await browserApi(
        admin.page,
        'POST',
        `${data.apiUrl}/Emprestimos`,
        {
          diasParaDevolucao: loanDays,
          produtos: [{ produtoId: product.id, quantidade: loanQuantity }],
        }
      );
      expect(adminCreation.status).toBe(401);

      for (const action of ['aprovar', 'reprovar']) {
        const missingDecision = await browserApi(
          admin.page,
          'PATCH',
          `${data.apiUrl}/Emprestimos/${action}/2147483000`,
          { aprovadorId: sessionUserId(admin.login.userId) }
        );
        expect(missingDecision.status).toBe(404);
      }

      const state = await getLoan(
        request,
        data,
        admin.login.sessionCookie,
        created.id
      );
      expect(state.status).toBe('Pendente');
      await expectProductQuantity(
        request,
        data,
        admin.login.sessionCookie,
        product.id,
        initialStock
      );
      expect(
        (await getAllLoans(request, data, admin.login.sessionCookie)).filter(
          (loan) => loan.solicitante?.email === data.administrator.email
        )
      ).toHaveLength(0);
    } finally {
      await admin.close();
    }
  });

  test('devolve pelo vínculo ou pela administração, preserva estoque e consulta autoria', async ({
    browser,
    page,
    request,
  }) => {
    const data = await seedScenario('return-audit');
    const firstBorrowerLogin = await loginInBrowser(
      page,
      data,
      data.borrower,
      /\/mentee\/?$/
    );
    const product = await findProduct(
      request,
      data,
      firstBorrowerLogin.sessionCookie
    );
    const mentorLoan = await createLoan(page, data, product.id);

    const secondBorrower = {
      email:
        process.env.E2E_SEED_SECOND_BORROWER_EMAIL ??
        `synthetic-second-borrower-${data.scenario}@example.invalid`,
      password:
        process.env.E2E_SEED_SECOND_BORROWER_PASSWORD ??
        `synthetic-second-borrower-${data.scenario}-password`,
    };
    await loginInBrowser(page, data, secondBorrower, /\/mentee\/?$/);
    const outOfScopeLoan = await createLoan(
      page,
      data,
      product.id,
      loanQuantity,
      secondBorrower.email
    );

    const administrator = await openAdminPage(browser, data);
    try {
      for (const loan of [mentorLoan, outOfScopeLoan]) {
        await openPendingLoan(administrator.page, loan);
        await decideWithKeyboard(
          administrator.page,
          data,
          loan,
          decisions.approve
        );
      }

      const mentor = await loginInBrowser(
        page,
        data,
        data.mentor,
        /\/mentor\/?$/
      );
      const mentorId = sessionUserId(mentor.userId);
      const outOfScopeReturn = await browserApi(
        page,
        'PATCH',
        `${data.apiUrl}/Emprestimos/devolver/${outOfScopeLoan.id}`
      );
      expect(outOfScopeReturn.status).toBe(404);
      expect(JSON.parse(outOfScopeReturn.text)).toMatchObject({
        code: 'resource_not_found',
      });
      await expectLoanStatus(
        request,
        data,
        administrator.login.sessionCookie,
        outOfScopeLoan.id,
        'Aprovado'
      );
      await expectProductQuantity(
        request,
        data,
        administrator.login.sessionCookie,
        product.id,
        approvedStock - loanQuantity
      );

      const approvedMentorLoan = await getLoan(
        request,
        data,
        administrator.login.sessionCookie,
        mentorLoan.id
      );
      expect(approvedMentorLoan.dataPrevistaDevolucao).not.toBeNull();
      expect(approvedMentorLoan.dataDevolucao).toBeNull();

      const authorizedReturn = await browserApi(
        page,
        'PATCH',
        `${data.apiUrl}/Emprestimos/devolver/${mentorLoan.id}`
      );
      expect(authorizedReturn.status).toBe(204);

      const returnedMentorLoan = await getLoan(
        request,
        data,
        administrator.login.sessionCookie,
        mentorLoan.id
      );
      expect(returnedMentorLoan.dataPrevistaDevolucao).toBe(
        approvedMentorLoan.dataPrevistaDevolucao
      );
      expect(returnedMentorLoan.dataDevolucao).not.toBeNull();
      expect(Date.parse(returnedMentorLoan.dataDevolucao!)).not.toBeNaN();
      await expectProductQuantity(
        request,
        data,
        administrator.login.sessionCookie,
        product.id,
        approvedStock
      );

      const repeatedReturn = await browserApi(
        page,
        'PATCH',
        `${data.apiUrl}/Emprestimos/devolver/${mentorLoan.id}`
      );
      expect(repeatedReturn.status).toBe(409);
      expect(JSON.parse(repeatedReturn.text)).toMatchObject({
        code: 'loan_return_already_recorded',
      });
      await expectProductQuantity(
        request,
        data,
        administrator.login.sessionCookie,
        product.id,
        approvedStock
      );

      const mentorAuditResponse = await request.get(
        `${data.apiUrl}/Auditoria/logs?recurso=emprestimo:${mentorLoan.id}&usuarioId=${mentorId}&pagina=1&tamanhoPagina=100`,
        { headers: sessionCookieHeader(administrator.login.sessionCookie) }
      );
      expect(mentorAuditResponse.status()).toBe(200);
      const mentorAuditPage = (await mentorAuditResponse.json()) as AuditPage;
      expect(
        mentorAuditPage.itens.filter(
          (record) => record.acao === 'devolucao_emprestimo'
        )
      ).toEqual([
        expect.objectContaining({
          recurso: `emprestimo:${mentorLoan.id}`,
          origem: 'UsuarioAutenticado',
          dataHoraUtc: expect.any(String),
        }),
      ]);

      await administrator.page.goto(`/admin/return?id=${outOfScopeLoan.id}`);
      await expect(
        administrator.page.getByRole('heading', {
          name: 'Devolução de Empréstimo',
        })
      ).toBeVisible();
      const adminReturnResponse = administrator.page.waitForResponse(
        (response) =>
          response.url() ===
            `${data.apiUrl}/Emprestimos/devolver/${outOfScopeLoan.id}` &&
          response.request().method() === 'PATCH'
      );
      await administrator.page
        .getByRole('button', { name: 'Registrar Devolução' })
        .click();
      expect((await adminReturnResponse).status()).toBe(204);
      await expect(administrator.page.getByText('Devolvido')).toBeVisible();

      const returnedAdminLoan = await getLoan(
        request,
        data,
        administrator.login.sessionCookie,
        outOfScopeLoan.id
      );
      expect(returnedAdminLoan.dataPrevistaDevolucao).not.toBeNull();
      expect(returnedAdminLoan.dataDevolucao).not.toBeNull();
      await expectProductQuantity(
        request,
        data,
        administrator.login.sessionCookie,
        product.id,
        initialStock
      );

      const adminAuditResponse = await request.get(
        `${data.apiUrl}/Auditoria/logs?recurso=emprestimo:${outOfScopeLoan.id}&usuarioId=${administrator.login.userId}&pagina=1&tamanhoPagina=100`,
        { headers: sessionCookieHeader(administrator.login.sessionCookie) }
      );
      expect(adminAuditResponse.status()).toBe(200);
      const adminAuditPage = (await adminAuditResponse.json()) as AuditPage;
      expect(
        adminAuditPage.itens.filter(
          (record) => record.acao === 'devolucao_emprestimo'
        )
      ).toEqual([
        expect.objectContaining({
          recurso: `emprestimo:${outOfScopeLoan.id}`,
          origem: 'UsuarioAutenticado',
          dataHoraUtc: expect.any(String),
        }),
      ]);
    } finally {
      await administrator.close();
    }
  });
});
