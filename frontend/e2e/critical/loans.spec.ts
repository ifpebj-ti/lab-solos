import { createHash } from 'node:crypto';

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

import {
  scenarioData,
  seedE2eScenario,
  type E2eScenarioData,
  type ScenarioCredentials,
} from '../infra/e2e-data';

type LoginResponse = {
  token: string;
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
  dataAprovacao: string | null;
  produtos: Array<{ produto: Product; quantidade: number }>;
  solicitante: { email: string } | null;
  aprovador: { email: string } | null;
};

const loanQuantity = 2;
const loanDays = 5;
const initialStock = 100;
const approvedStock = initialStock - loanQuantity;

test.describe('empréstimos reais — CT-006, CT-007 e CT-008', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  const expectedProductName = (scenario: string) => {
    const token = createHash('sha256').update(scenario).digest('hex').slice(0, 12);
    return `E2E Product ${token}`;
  };

  const authorization = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const parseJson = <T>(response: BrowserApiResponse): T => {
    expect(response.text).not.toBe('');
    return JSON.parse(response.text) as T;
  };

  const browserApi = async (
    page: Page,
    method: string,
    url: string,
    token?: string,
    data?: unknown
  ): Promise<BrowserApiResponse> =>
    page.evaluate(
      async ({ method: requestMethod, url: requestUrl, token: requestToken, data: requestData }) => {
        const response = await fetch(requestUrl, {
          method: requestMethod,
          headers: {
            ...(requestToken
              ? { Authorization: `Bearer ${requestToken}` }
              : {}),
            ...(requestData !== undefined
              ? { 'Content-Type': 'application/json' }
              : {}),
          },
          body: requestData === undefined ? undefined : JSON.stringify(requestData),
        });

        return {
          status: response.status,
          text: await response.text(),
        };
      },
      { method, url, token, data }
    );

  const loginInBrowser = async (
    page: Page,
    data: E2eScenarioData,
    credentials: ScenarioCredentials,
    expectedPath: RegExp
  ): Promise<LoginResponse> => {
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
    expect(login.token).toEqual(expect.any(String));
    expect(login.requiresPasswordChange).toBe(false);
    await expect(page).toHaveURL(expectedPath);
    return login;
  };

  const tokenSubject = (token: string): number => {
    const payload = token.split('.')[1];
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as { sub?: string };
    const subject = Number(claims.sub);
    expect(Number.isInteger(subject)).toBe(true);
    expect(subject).toBeGreaterThan(0);
    return subject;
  };

  const findProduct = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    token: string
  ): Promise<Product> => {
    const response = await request.get(`${data.apiUrl}/Produtos`, {
      headers: authorization(token),
    });
    expect(response.status()).toBe(200);
    const products = (await response.json()) as Product[];
    const matches = products.filter(
      (product) => product.nomeProduto === expectedProductName(data.scenario)
    );
    expect(matches).toHaveLength(1);
    return matches[0];
  };

  const getProduct = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    token: string,
    productId: number
  ): Promise<Product> => {
    const response = await request.get(`${data.apiUrl}/Produtos/${productId}`, {
      headers: authorization(token),
    });
    expect(response.status()).toBe(200);
    return (await response.json()) as Product;
  };

  const getLoan = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    token: string,
    loanId: number
  ): Promise<Loan> => {
    const response = await request.get(`${data.apiUrl}/Emprestimos/${loanId}`, {
      headers: authorization(token),
    });
    expect(response.status()).toBe(200);
    return (await response.json()) as Loan;
  };

  const getLoansForUser = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    token: string,
    userId: number
  ): Promise<Loan[]> => {
    const response = await request.get(
      `${data.apiUrl}/Emprestimos/usuario/${userId}`,
      { headers: authorization(token) }
    );
    expect(response.status()).toBe(200);
    return (await response.json()) as Loan[];
  };

  const getAllLoans = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    token: string
  ): Promise<Loan[]> => {
    const response = await request.get(`${data.apiUrl}/Emprestimos`, {
      headers: authorization(token),
    });
    expect(response.status()).toBe(200);
    return (await response.json()) as Loan[];
  };

  const expectProductQuantity = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    token: string,
    productId: number,
    quantity: number
  ): Promise<void> => {
    expect(
      (await getProduct(request, data, token, productId)).quantidade
    ).toBe(quantity);
  };

  const expectLoanStatus = async (
    request: APIRequestContext,
    data: E2eScenarioData,
    token: string,
    loanId: number,
    status: string
  ): Promise<void> => {
    expect((await getLoan(request, data, token, loanId)).status).toBe(status);
  };

  const seedScenario = async (name: string): Promise<E2eScenarioData> => {
    const data = scenarioData(`t026-${name}`);
    await seedE2eScenario(data.scenario);
    return data;
  };

  const createLoan = async (
    page: Page,
    data: E2eScenarioData,
    token: string,
    productId: number,
    quantity = loanQuantity
  ): Promise<Loan> => {
    const response = await browserApi(
      page,
      'POST',
      `${data.apiUrl}/Emprestimos`,
      token,
      {
        diasParaDevolucao: loanDays,
        produtos: [{ produtoId: productId, quantidade: quantity }],
      }
    );
    expect(response.status).toBe(201);
    const loan = parseJson<Loan>(response);
    expect(loan.status).toBe('Pendente');
    expect(loan.solicitante?.email).toBe(data.borrower.email);
    expect(loan.produtos).toEqual([
      expect.objectContaining({ quantidade: quantity }),
    ]);
    return loan;
  };

  const openAdminPage = async (
    browser: Browser,
    data: E2eScenarioData
  ): Promise<{ page: Page; close: () => Promise<void>; login: LoginResponse }> => {
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
    const borrowerId = tokenSubject(borrowerLogin.token);
    const product = await findProduct(request, data, borrowerLogin.token);
    expect(product.quantidade).toBe(initialStock);

    const created = await createLoan(
      page,
      data,
      borrowerLogin.token,
      product.id
    );
    const borrowerLoans = await getLoansForUser(
      request,
      data,
      borrowerLogin.token,
      borrowerId
    );
    expect(borrowerLoans.filter((loan) => loan.id === created.id)).toHaveLength(1);
    expect(borrowerLoans.find((loan) => loan.id === created.id)?.status).toBe(
      'Pendente'
    );

    const admin = await openAdminPage(browser, data);
    try {
      const adminId = tokenSubject(admin.login.token);
      const pendingLoans = await getAllLoans(request, data, admin.login.token);
      const pending = pendingLoans.find((loan) => loan.id === created.id);
      expect(pending?.status).toBe('Pendente');
      expect(pending?.solicitante?.email).toBe(data.borrower.email);

      const approvedResponse = await browserApi(
        admin.page,
        'PATCH',
        `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
        admin.login.token,
        { aprovadorId: adminId }
      );
      expect(approvedResponse.status).toBe(204);

      const freshAdmin = await openAdminPage(browser, data);
      try {
        const approved = await getLoan(
          request,
          data,
          freshAdmin.login.token,
          created.id
        );
        expect(approved.status).toBe('Aprovado');
        expect(approved.aprovador?.email).toBe(data.administrator.email);
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.token,
          product.id,
          approvedStock
        );

        const duplicateDecision = await browserApi(
          freshAdmin.page,
          'PATCH',
          `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
          freshAdmin.login.token,
          { aprovadorId: tokenSubject(freshAdmin.login.token) }
        );
        expect(duplicateDecision.status).toBe(400);

        await expectLoanStatus(
          request,
          data,
          freshAdmin.login.token,
          created.id,
          'Aprovado'
        );
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.token,
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
    const product = await findProduct(request, data, borrowerLogin.token);
    const created = await createLoan(
      page,
      data,
      borrowerLogin.token,
      product.id
    );
    const admin = await openAdminPage(browser, data);

    try {
      const adminId = tokenSubject(admin.login.token);
      const pending = (await getAllLoans(request, data, admin.login.token)).find(
        (loan) => loan.id === created.id
      );
      expect(pending?.status).toBe('Pendente');

      const rejectedResponse = await browserApi(
        admin.page,
        'PATCH',
        `${data.apiUrl}/Emprestimos/reprovar/${created.id}`,
        admin.login.token,
        { aprovadorId: adminId }
      );
      expect(rejectedResponse.status).toBe(204);

      const freshAdmin = await openAdminPage(browser, data);
      try {
        const rejected = await getLoan(
          request,
          data,
          freshAdmin.login.token,
          created.id
        );
        expect(rejected.status).toBe('Rejeitado');
        expect(rejected.aprovador?.email).toBe(data.administrator.email);
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.token,
          product.id,
          initialStock
        );

        const duplicateDecision = await browserApi(
          freshAdmin.page,
          'PATCH',
          `${data.apiUrl}/Emprestimos/reprovar/${created.id}`,
          freshAdmin.login.token,
          { aprovadorId: tokenSubject(freshAdmin.login.token) }
        );
        expect(duplicateDecision.status).toBe(400);
        await expectLoanStatus(
          request,
          data,
          freshAdmin.login.token,
          created.id,
          'Rejeitado'
        );
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.token,
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
    const product = await findProduct(request, data, borrowerLogin.token);
    const created = await createLoan(
      page,
      data,
      borrowerLogin.token,
      product.id,
      initialStock + 1
    );
    const admin = await openAdminPage(browser, data);

    try {
      const failedApproval = await browserApi(
        admin.page,
        'PATCH',
        `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
        admin.login.token,
        { aprovadorId: tokenSubject(admin.login.token) }
      );
      expect(failedApproval.status).toBe(400);

      const freshAdmin = await openAdminPage(browser, data);
      try {
        const pending = await getLoan(
          request,
          data,
          freshAdmin.login.token,
          created.id
        );
        expect(pending.status).toBe('Pendente');
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.token,
          product.id,
          initialStock
        );

        const retry = await browserApi(
          freshAdmin.page,
          'PATCH',
          `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
          freshAdmin.login.token,
          { aprovadorId: tokenSubject(freshAdmin.login.token) }
        );
        expect(retry.status).toBe(400);
        await expectLoanStatus(
          request,
          data,
          freshAdmin.login.token,
          created.id,
          'Pendente'
        );
        await expectProductQuantity(
          request,
          data,
          freshAdmin.login.token,
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
    const product = await findProduct(request, data, borrowerLogin.token);
    const created = await createLoan(
      page,
      data,
      borrowerLogin.token,
      product.id
    );

    const anonymousCreation = await browserApi(
      page,
      'POST',
      `${data.apiUrl}/Emprestimos`,
      undefined,
      {
        diasParaDevolucao: loanDays,
        produtos: [{ produtoId: product.id, quantidade: loanQuantity }],
      }
    );
    expect(anonymousCreation.status).toBe(401);

    const borrowerDecision = await browserApi(
      page,
      'PATCH',
      `${data.apiUrl}/Emprestimos/aprovar/${created.id}`,
      borrowerLogin.token,
      { aprovadorId: tokenSubject(borrowerLogin.token) }
    );
    expect(borrowerDecision.status).toBe(403);

    const admin = await openAdminPage(browser, data);
    try {
      const adminCreation = await browserApi(
        admin.page,
        'POST',
        `${data.apiUrl}/Emprestimos`,
        admin.login.token,
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
          admin.login.token,
          { aprovadorId: tokenSubject(admin.login.token) }
        );
        expect(missingDecision.status).toBe(404);
      }

      const state = await getLoan(
        request,
        data,
        admin.login.token,
        created.id
      );
      expect(state.status).toBe('Pendente');
      await expectProductQuantity(
        request,
        data,
        admin.login.token,
        product.id,
        initialStock
      );
      expect(
        (await getAllLoans(request, data, admin.login.token)).filter(
          (loan) => loan.solicitante?.email === data.administrator.email
        )
      ).toHaveLength(0);
    } finally {
      await admin.close();
    }
  });
});
