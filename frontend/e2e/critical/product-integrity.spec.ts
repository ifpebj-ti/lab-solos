import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

import { scenarioData, seedE2eScenario } from '../infra/e2e-data';

type Credentials = { email: string; password: string };

type LoginResponse = {
  requiresPasswordChange: boolean;
};

type AuthSession = {
  sessionCookie: string;
  userId: number;
  role: string;
  requiresPasswordChange: boolean;
  csrfToken: string;
};

type ProductDetail = {
  id: number;
  catmat: string;
  nomeProduto: string;
  quantidade: number;
  quantidadeMinima: number;
  status: string;
  lote: { codigoLote: string } | null;
};

type CatalogProduct = { id: number; nomeProduto: string };

type CatalogPage = {
  itens: CatalogProduct[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
};

type LoanResponse = { id: number; status: string };

type ProductHistory = {
  produtoId: number;
  nomeProduto: string;
  historico: Array<{
    emprestimoId: number;
    quantidadeEmprestada: number;
    lote: string | null;
  }>;
  totalEmprestimos: number;
  totalQuantidadeEmprestada: number;
};

const browserOrigin = new URL(
  process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'
).origin;

const sessionHeaders = (session: AuthSession) => ({
  Cookie: `lab_solos_session=${session.sessionCookie}`,
  Origin: browserOrigin,
  'X-CSRF-Token': session.csrfToken,
});

const loginInBrowser = async (
  page: Page,
  apiUrl: string,
  credentials: Credentials,
  expectedPath: RegExp
): Promise<AuthSession> => {
  await page.goto('/');
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().toLowerCase() === `${apiUrl}/auth/login`.toLowerCase() &&
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

  const sessionResponse = await page.evaluate(async (sessionApiUrl) => {
    const result = await fetch(`${sessionApiUrl}/Auth/session`, {
      credentials: 'include',
    });
    return { status: result.status, session: await result.json() };
  }, apiUrl);
  expect(sessionResponse.status).toBe(200);
  const session = sessionResponse.session as Omit<AuthSession, 'sessionCookie'>;
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
  expect(
    await page.evaluate(() => sessionStorage.getItem('auth:csrf-token'))
  ).toBe(session.csrfToken);

  return { ...session, sessionCookie };
};

const loginInIsolatedBrowser = async (
  browser: Browser,
  apiUrl: string,
  credentials: Credentials,
  expectedPath: RegExp
): Promise<AuthSession> => {
  const context = await browser.newContext({ baseURL: browserOrigin });
  try {
    return await loginInBrowser(
      await context.newPage(),
      apiUrl,
      credentials,
      expectedPath
    );
  } finally {
    await context.close();
  }
};

const getProduct = async (
  request: APIRequestContext,
  apiUrl: string,
  session: AuthSession,
  productId: number
): Promise<ProductDetail> => {
  const response = await request.get(`${apiUrl}/Produtos/${productId}`, {
    headers: sessionHeaders(session),
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as ProductDetail;
};

const getAllCatalogProducts = async (
  request: APIRequestContext,
  url: string,
  session: AuthSession
): Promise<CatalogProduct[]> => {
  const pageSize = 100;
  const first = await request.get(url, {
    headers: sessionHeaders(session),
    params: { pagina: 1, tamanhoPagina: pageSize },
  });
  expect(first.status()).toBe(200);
  const firstPage = (await first.json()) as CatalogPage;
  expect(Array.isArray(firstPage.itens)).toBe(true);

  const products = [...firstPage.itens];
  for (let pagina = 2; pagina <= firstPage.totalPaginas; pagina += 1) {
    const response = await request.get(url, {
      headers: sessionHeaders(session),
      params: { pagina, tamanhoPagina: pageSize },
    });
    expect(response.status()).toBe(200);
    const nextPage = (await response.json()) as CatalogPage;
    expect(Array.isArray(nextPage.itens)).toBe(true);
    products.push(...nextPage.itens);
  }
  return products;
};

const createLoan = async (
  request: APIRequestContext,
  apiUrl: string,
  session: AuthSession,
  productId: number,
  quantity: number
): Promise<LoanResponse> => {
  const response = await request.post(`${apiUrl}/Emprestimos`, {
    headers: sessionHeaders(session),
    data: {
      diasParaDevolucao: 5,
      produtos: [{ produtoId: productId, quantidade: quantity }],
    },
  });
  expect(response.status()).toBe(201);
  const loan = (await response.json()) as LoanResponse;
  expect(loan.status).toBe('Pendente');
  return loan;
};

const readHistory = async (
  request: APIRequestContext,
  apiUrl: string,
  session: AuthSession,
  productId: number
): Promise<{ responseText: string; history: ProductHistory }> => {
  const response = await request.get(
    `${apiUrl}/Produtos/${productId}/historico-saida`,
    { headers: sessionHeaders(session) }
  );
  expect(response.status()).toBe(200);
  const responseText = await response.text();
  return { responseText, history: JSON.parse(responseText) as ProductHistory };
};

test.describe('integridade de produtos reais — T011', () => {
  test.setTimeout(180_000);

  test('preserva edição, vínculo, estoque e histórico após desativação', async ({
    browser,
    page,
    request,
  }) => {
    const scenario = `integrity-t011-${process.pid}-${Date.now()}`;
    const data = scenarioData(scenario);
    await seedE2eScenario(scenario);

    const admin = await loginInBrowser(
      page,
      data.apiUrl,
      data.administrator,
      /\/admin\/?$/
    );
    const mentor = await loginInIsolatedBrowser(
      browser,
      data.apiUrl,
      data.mentor,
      /\/mentor\/?$/
    );
    const borrower = await loginInIsolatedBrowser(
      browser,
      data.apiUrl,
      data.borrower,
      /\/mentee\/?$/
    );
    const secondMentorCredentials: Credentials = {
      email: `synthetic-second-mentor-${scenario}@example.invalid`,
      password: `synthetic-second-mentor-${scenario}-password`,
    };
    const secondBorrowerCredentials: Credentials = {
      email: `synthetic-second-borrower-${scenario}@example.invalid`,
      password: `synthetic-second-borrower-${scenario}-password`,
    };
    const secondMentor = await loginInIsolatedBrowser(
      browser,
      data.apiUrl,
      secondMentorCredentials,
      /\/mentor\/?$/
    );
    const secondBorrower = await loginInIsolatedBrowser(
      browser,
      data.apiUrl,
      secondBorrowerCredentials,
      /\/mentee\/?$/
    );

    const originalName = `T011 Produto ${scenario}`;
    const updatedName = `${originalName} editado`;
    const catmat = `T011-${Date.now()}`;
    const batchCode = `LOTE-T011-${Date.now()}`;
    const initialStock = 20;
    const firstLoanQuantity = 2;
    const secondLoanQuantity = 3;

    const createProductResponse = await request.post(
      `${data.apiUrl}/Produtos`,
      {
        headers: sessionHeaders(admin),
        data: {
          nomeProduto: originalName,
          tipo: 'Outro',
          quantidade: initialStock,
          quantidadeMinima: 2,
          localizacaoProduto: 'Prateleira sintética T011',
          unidadeMedida: 'Unidade',
          catmat,
        },
      }
    );
    expect(createProductResponse.status()).toBe(201);
    const createdProduct = (await createProductResponse.json()) as {
      id: number;
    };
    const productId = createdProduct.id;
    expect(Number.isInteger(productId)).toBe(true);

    const createBatchResponse = await request.post(
      `${data.apiUrl}/Lote/AddLote`,
      {
        headers: sessionHeaders(admin),
        data: {
          codigoLote: batchCode,
          produtoIds: [productId],
          dataEntrada: '2026-11-19',
          quantidadeLote: initialStock,
          nomeProduto: originalName,
          tipo: 'Outro',
          quantidade: initialStock,
          quantidadeMinima: 2,
          localizacaoProduto: 'Prateleira sintética T011',
          catmat,
          unidadeMedida: 'Unidade',
        },
      }
    );
    expect(createBatchResponse.status()).toBe(201);
    const beforeEdit = await getProduct(request, data.apiUrl, admin, productId);
    expect(beforeEdit).toMatchObject({
      catmat,
      nomeProduto: originalName,
      quantidade: initialStock,
      quantidadeMinima: 2,
    });
    expect(beforeEdit.lote?.codigoLote).toBe(batchCode);

    await page.goto('/admin/search-material');
    await page.getByRole('textbox', { name: 'Pesquisar' }).fill(originalName);
    const catalog = page.getByRole('list', { name: 'Produtos', exact: true });
    const productRow = catalog
      .getByRole('listitem')
      .filter({ hasText: originalName });
    await expect(productRow).toHaveCount(1);
    await productRow.getByRole('link', { name: String(productId) }).click();
    await expect(page).toHaveURL(`/admin/verification?id=${productId}`);
    await page.getByRole('button', { name: 'Editar Produto' }).click();
    await page.getByLabel('Nome do Produto').fill(updatedName);

    const patchRequestPromise = page.waitForRequest(
      (candidate) =>
        candidate.url().toLowerCase() ===
          `${data.apiUrl}/produtos/${productId}`.toLowerCase() &&
        candidate.method() === 'PATCH'
    );
    const patchResponsePromise = page.waitForResponse(
      (candidate) =>
        candidate.url().toLowerCase() ===
          `${data.apiUrl}/produtos/${productId}`.toLowerCase() &&
        candidate.request().method() === 'PATCH'
    );
    await page.getByRole('button', { name: 'Salvar Alterações' }).click();
    const patchRequest = await patchRequestPromise;
    expect(JSON.parse(patchRequest.postData() ?? '[]')).toEqual([
      { op: 'replace', path: '/nomeProduto', value: updatedName },
    ]);
    const patchResponse = await patchResponsePromise;
    expect(patchResponse.status()).toBe(200);
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();

    let savedProduct = await getProduct(request, data.apiUrl, admin, productId);
    expect(savedProduct).toMatchObject({
      catmat,
      nomeProduto: updatedName,
      quantidade: initialStock,
      quantidadeMinima: 2,
      status: beforeEdit.status,
    });
    expect(savedProduct.lote?.codigoLote).toBe(batchCode);

    const firstLoan = await createLoan(
      request,
      data.apiUrl,
      borrower,
      productId,
      firstLoanQuantity
    );
    const secondLoan = await createLoan(
      request,
      data.apiUrl,
      secondBorrower,
      productId,
      secondLoanQuantity
    );

    const emptyMentorHistory = await readHistory(
      request,
      data.apiUrl,
      mentor,
      productId
    );
    expect(emptyMentorHistory.history).toMatchObject({
      historico: [],
      totalEmprestimos: 0,
      totalQuantidadeEmprestada: 0,
    });

    for (const loan of [firstLoan, secondLoan]) {
      const approveResponse = await request.patch(
        `${data.apiUrl}/Emprestimos/aprovar/${loan.id}`,
        { headers: sessionHeaders(admin) }
      );
      expect(approveResponse.status()).toBe(204);
    }
    expect(
      (await getProduct(request, data.apiUrl, admin, productId)).quantidade
    ).toBe(initialStock - firstLoanQuantity - secondLoanQuantity);

    for (const [loan, session] of [
      [firstLoan, mentor],
      [secondLoan, secondMentor],
    ] as const) {
      const returnResponse = await request.patch(
        `${data.apiUrl}/Emprestimos/devolver/${loan.id}`,
        { headers: sessionHeaders(session) }
      );
      expect(returnResponse.status()).toBe(204);
    }

    savedProduct = await getProduct(request, data.apiUrl, admin, productId);
    expect(savedProduct.quantidade).toBe(initialStock);
    expect(savedProduct.lote?.codigoLote).toBe(batchCode);

    const invalidPatchResponse = await request.patch(
      `${data.apiUrl}/Produtos/${productId}`,
      {
        headers: sessionHeaders(admin),
        data: [
          { op: 'replace', path: '/nomeProduto', value: 'Alteração inválida' },
          { op: 'replace', path: '/loteId', value: null },
        ],
      }
    );
    expect(invalidPatchResponse.status()).toBe(400);
    savedProduct = await getProduct(request, data.apiUrl, admin, productId);
    expect(savedProduct.nomeProduto).toBe(updatedName);
    expect(savedProduct.quantidade).toBe(initialStock);
    expect(savedProduct.lote?.codigoLote).toBe(batchCode);

    const deleteResponse = await request.delete(
      `${data.apiUrl}/Produtos/${productId}`,
      { headers: sessionHeaders(admin) }
    );
    expect(deleteResponse.status()).toBe(409);
    expect(await deleteResponse.json()).toMatchObject({
      code: 'product_has_dependencies',
    });

    const deactivateResponse = await request.post(
      `${data.apiUrl}/Produtos/${productId}/desativar`,
      { headers: sessionHeaders(admin) }
    );
    expect(deactivateResponse.status()).toBe(204);

    const activeProducts = await getAllCatalogProducts(
      request,
      `${data.apiUrl}/Produtos`,
      admin
    );
    expect(activeProducts.some((product) => product.id === productId)).toBe(
      false
    );
    const activeProductsByType = await getAllCatalogProducts(
      request,
      `${data.apiUrl}/Produtos/tipo/2`,
      admin
    );
    expect(
      activeProductsByType.some((product) => product.id === productId)
    ).toBe(false);

    const unavailableLoanResponse = await request.post(
      `${data.apiUrl}/Emprestimos`,
      {
        headers: sessionHeaders(borrower),
        data: {
          diasParaDevolucao: 5,
          produtos: [{ produtoId: productId, quantidade: 1 }],
        },
      }
    );
    expect(unavailableLoanResponse.status()).toBe(409);
    expect(await unavailableLoanResponse.json()).toMatchObject({
      code: 'loan_product_deactivated',
    });

    const mentorHistory = await readHistory(
      request,
      data.apiUrl,
      mentor,
      productId
    );
    expect(mentorHistory.history.historico).toHaveLength(1);
    expect(mentorHistory.history.historico[0]).toMatchObject({
      emprestimoId: firstLoan.id,
      quantidadeEmprestada: firstLoanQuantity,
      lote: batchCode,
    });
    expect(mentorHistory.history.totalQuantidadeEmprestada).toBe(
      firstLoanQuantity
    );
    expect(mentorHistory.responseText).not.toContain(data.borrower.email);
    expect(mentorHistory.responseText).not.toContain(
      secondBorrowerCredentials.email
    );

    const secondMentorHistory = await readHistory(
      request,
      data.apiUrl,
      secondMentor,
      productId
    );
    expect(secondMentorHistory.history.historico).toHaveLength(1);
    expect(secondMentorHistory.history.historico[0]).toMatchObject({
      emprestimoId: secondLoan.id,
      quantidadeEmprestada: secondLoanQuantity,
      lote: batchCode,
    });
    expect(secondMentorHistory.history.totalQuantidadeEmprestada).toBe(
      secondLoanQuantity
    );
    expect(secondMentorHistory.responseText).not.toContain(data.borrower.email);
    expect(secondMentorHistory.responseText).not.toContain(
      secondBorrowerCredentials.email
    );

    const adminHistory = await readHistory(
      request,
      data.apiUrl,
      admin,
      productId
    );
    expect(adminHistory.history).toMatchObject({
      produtoId: productId,
      nomeProduto: updatedName,
      totalEmprestimos: 2,
      totalQuantidadeEmprestada: firstLoanQuantity + secondLoanQuantity,
    });
    expect(
      adminHistory.history.historico.map((item) => item.emprestimoId).sort()
    ).toEqual([firstLoan.id, secondLoan.id].sort());
    expect(
      adminHistory.history.historico.every((item) => item.lote === batchCode)
    ).toBe(true);

    const linkedBatchResponse = await request.get(
      `${data.apiUrl}/Lote/GetByCodigo/${encodeURIComponent(batchCode)}`,
      { headers: sessionHeaders(admin) }
    );
    expect(linkedBatchResponse.status()).toBe(200);
    const linkedBatch = (await linkedBatchResponse.json()) as {
      produtos: Array<{ id: number; nomeProduto: string }>;
    };
    expect(linkedBatch.produtos).toEqual([
      expect.objectContaining({ id: productId, nomeProduto: updatedName }),
    ]);

    await page.goto('/admin/search-material');
    await page.getByRole('textbox', { name: 'Pesquisar' }).fill(updatedName);
    const productList = page.getByRole('list', {
      name: 'Produtos',
      exact: true,
    });
    await expect(
      productList.getByRole('listitem').filter({ hasText: updatedName })
    ).toHaveCount(0);

    await page.goto(`/admin/verification?id=${productId}`);
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
    const historyList = page.getByRole('list', {
      name: 'Histórico de Movimentações',
    });
    const historyRows = historyList.getByRole('listitem');
    await expect(historyRows).toHaveCount(2);
    const displayedLoanIds: number[] = [];
    for (let index = 0; index < (await historyRows.count()); index += 1) {
      const idCell = historyRows.nth(index).locator('dd').nth(1);
      displayedLoanIds.push(Number(await idCell.innerText()));
    }
    expect(displayedLoanIds.sort((left, right) => left - right)).toEqual(
      [firstLoan.id, secondLoan.id].sort((left, right) => left - right)
    );
    await expect(
      page.getByText(data.borrower.email, { exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByText(secondBorrowerCredentials.email, { exact: true })
    ).toHaveCount(0);

    const savedAfterDeactivation = await getProduct(
      request,
      data.apiUrl,
      admin,
      productId
    );
    expect(savedAfterDeactivation).toMatchObject({
      catmat,
      nomeProduto: updatedName,
      quantidade: initialStock,
      quantidadeMinima: 2,
      status: beforeEdit.status,
    });
    expect(savedAfterDeactivation.lote?.codigoLote).toBe(batchCode);
  });
});
