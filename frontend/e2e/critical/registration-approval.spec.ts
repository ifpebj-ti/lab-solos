import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { e2eScenario, seedE2eScenario } from '../infra/e2e-data';

type Credentials = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  requiresPasswordChange: boolean;
};

type UserRecord = {
  id: number;
  email: string;
  nomeCompleto: string;
  status: string;
  nivelUsuario: string;
};

const registrationPassword = 'Synthetic Registration Password 2026!';

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.invalid`;

const authorization = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const loginViaApi = async (
  request: APIRequestContext,
  credentials: Credentials
): Promise<LoginResponse> => {
  const response = await request.post(`${e2eScenario.apiUrl}/Auth/login`, {
    data: credentials,
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as LoginResponse;
  expect(body.token).toEqual(expect.any(String));
  expect(body.requiresPasswordChange).toBe(false);
  return body;
};

const loginViaBrowser = async (
  page: Page,
  credentials: Credentials
): Promise<LoginResponse> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${e2eScenario.apiUrl}/Auth/login` &&
      response.request().method() === 'POST'
  );

  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Submeter Login' }).click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return (await response.json()) as LoginResponse;
};

const usersForAdmin = async (
  request: APIRequestContext,
  token: string
): Promise<UserRecord[]> => {
  const response = await request.get(`${e2eScenario.apiUrl}/Usuarios`, {
    headers: authorization(token),
  });

  expect(response.status()).toBe(200);
  return (await response.json()) as UserRecord[];
};

const userByEmail = async (
  request: APIRequestContext,
  token: string,
  email: string
): Promise<UserRecord> => {
  const user = (await usersForAdmin(request, token)).find(
    (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
  );

  expect(user, `usuário ${email} deve existir no PostgreSQL`).toBeDefined();
  return user!;
};

const pendingUserByEmail = async (
  request: APIRequestContext,
  token: string,
  email: string
): Promise<UserRecord> => {
  const response = await request.get(`${e2eScenario.apiUrl}/Usuarios/aprovacao`, {
    headers: authorization(token),
  });

  expect(response.status()).toBe(200);
  const pending = ((await response.json()) as UserRecord[]).find(
    (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
  );

  expect(pending, `solicitação ${email} deve estar pendente`).toBeDefined();
  expect(pending?.status).toBe('Pendente');
  return pending!;
};

const fillRegistrationForm = async (
  page: Page,
  email: string,
  responsibleEmail: string
) => {
  await page.getByText('Tipo', { exact: true }).click();
  await page.getByRole('option', { name: 'Mentor', exact: true }).click();
  await page.locator('input[name="nome"]').fill('Mentor Sintético T025');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="senha"]').fill(registrationPassword);
  await page.locator('input[name="repeat"]').fill(registrationPassword);
  await page.locator('input[name="instituicao"]').fill('IFPE');
  await page.locator('input[name="curso"]').fill('ES');
  await page.locator('input[name="cidade"]').fill('Belo Jardim');
  await page.locator('input[name="telefone"]').fill('81999999999');
  await page
    .locator('input[name="emailMentor"]')
    .fill(responsibleEmail);
};

const registerThroughBrowser = async (
  page: Page,
  email: string,
  responsibleEmail = e2eScenario.mentor.email
) => {
  await page.goto('/create-account');
  await fillRegistrationForm(page, email, responsibleEmail);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${e2eScenario.apiUrl}/Usuarios` &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Criar Conta' }).click();
  return responsePromise;
};

const openResponsibleRegistrationRequests = async (
  page: Page,
  responsibleCredentials: Credentials
) => {
  await page.goto('/');
  const login = await loginViaBrowser(page, responsibleCredentials);
  expect(login.requiresPasswordChange).toBe(false);
  await expect(page).toHaveURL(/\/mentor\/?$/);
  await page.goto('/mentor/users-request');
  await expect(
    page.getByRole('heading', { name: /Solicitações de Cadastro/i })
  ).toBeVisible();
  return login;
};

test.describe('cadastro e aprovação reais — CT-002 e CT-003', () => {
  test.setTimeout(120_000);

  test.beforeEach(async () => {
    await seedE2eScenario();
  });

  test('cadastra pela interface, aprova como administrador e acessa depois', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('t025-approved');
    const registrationResponse = await registerThroughBrowser(page, email);

    expect(registrationResponse.status()).toBe(201);
    expect(await registrationResponse.json()).toMatchObject({
      email,
      status: 'Pendente',
    });

    await openResponsibleRegistrationRequests(
      page,
      e2eScenario.mentor
    );
    const adminLogin = await loginViaApi(request, e2eScenario.administrator);
    const pending = await pendingUserByEmail(
      request,
      adminLogin.token,
      email
    );
    const pendingRow = page.getByRole('listitem').filter({ hasText: email });

    await expect(
      pendingRow.getByRole('button', { name: /^Aprovar / })
    ).toBeVisible();
    await expect(pendingRow).toContainText(pending.nomeCompleto);
    const approvalResponse = page.waitForResponse(
      (response) =>
        response.url() ===
          `${e2eScenario.apiUrl}/Usuarios/dependentes/${pending.id}/aprovar` &&
        response.request().method() === 'PATCH'
    );
    await pendingRow.getByRole('button', { name: /^Aprovar / }).click();
    expect((await approvalResponse).status()).toBe(200);

    await expect(pendingRow).toHaveCount(0);

    const approved = await userByEmail(request, adminLogin.token, email);
    expect(approved.id).toBe(pending.id);
    expect(approved.status).toBe('Habilitado');

    await page.context().clearCookies();
    await page.goto('/');
    const approvedLogin = await loginViaBrowser(page, {
      email,
      password: registrationPassword,
    });
    expect(approvedLogin.requiresPasswordChange).toBe(false);
    await expect(page).toHaveURL(/\/mentor\/?$/);
  });

  test('exibe erro de cadastro e não persiste usuário inválido', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('t025-invalid');
    const invalidResponsible = uniqueEmail('missing-responsible');
    const registrationResponse = await registerThroughBrowser(
      page,
      email,
      invalidResponsible
    );

    expect(registrationResponse.status()).toBe(404);
    await expect(page).toHaveURL(/\/create-account$/);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      'recurso solicitado'
    );

    const adminLogin = await loginViaApi(request, e2eScenario.administrator);
    const users = await usersForAdmin(request, adminLogin.token);
    expect(users.some((user) => user.email === email)).toBe(false);
  });

  test('recusa solicitação e impede reprocessamento com estado preservado', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('t025-rejected');
    const registrationResponse = await registerThroughBrowser(page, email);
    expect(registrationResponse.status()).toBe(201);

    await openResponsibleRegistrationRequests(
      page,
      e2eScenario.mentor
    );
    const adminLogin = await loginViaApi(request, e2eScenario.administrator);
    const pending = await pendingUserByEmail(
      request,
      adminLogin.token,
      email
    );
    const administrator = await userByEmail(
      request,
      adminLogin.token,
      e2eScenario.administrator.email
    );

    const rejectionResponse = page.waitForResponse(
      (response) =>
        response.url() ===
          `${e2eScenario.apiUrl}/Usuarios/dependentes/${pending.id}/rejeitar` &&
        response.request().method() === 'PATCH'
    );
    const pendingRow = page.getByRole('listitem').filter({ hasText: email });
    await expect(pendingRow).toContainText(pending.nomeCompleto);
    await pendingRow.getByRole('button', { name: /^Recusar / }).click();
    expect((await rejectionResponse).status()).toBe(200);

    const rejected = await userByEmail(request, adminLogin.token, email);
    expect(rejected.status).toBe('Desabilitado');

    const reprocessResponse = await request.patch(
      `${e2eScenario.apiUrl}/Usuarios/dependentes/${pending.id}/aprovar`,
      {
        headers: authorization(adminLogin.token),
        data: { aprovadorId: administrator.id },
      }
    );
    expect(reprocessResponse.status()).toBe(400);
    expect(await userByEmail(request, adminLogin.token, email)).toMatchObject({
      id: pending.id,
      status: 'Desabilitado',
    });
  });
});
