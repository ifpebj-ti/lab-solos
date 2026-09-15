import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { e2eScenario, seedE2eScenario } from './infra/e2e-data';

type LoginResponse = {
  token: string;
  requiresPasswordChange: boolean;
};

type MailpitSummary = {
  ID: string;
  To?: Array<{ Address?: string }>;
};

type MailpitMessagesResponse = {
  messages: MailpitSummary[];
};

type MailpitMessage = {
  Text?: string;
};

const changedPassword = 'Synthetic E2E Changed Password 2026!';
const resetPassword = 'Synthetic E2E Reset Password 2026!';

test.describe('credenciais reais — CT-001, CT-004 e CT-005', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  test.beforeEach(async () => {
    await seedE2eScenario();
  });

  const submitLogin = async (
    page: Page,
    password: string,
    expectedStatus: number
  ): Promise<LoginResponse | undefined> => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${e2eScenario.apiUrl}/Auth/login` &&
        response.request().method() === 'POST'
    );
    await page.locator('input[name="email"]').fill(e2eScenario.administrator.email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: 'Submeter Login' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(expectedStatus);
    if (expectedStatus !== 200) return undefined;
    return (await response.json()) as LoginResponse;
  };

  const authorizedRequest = (request: APIRequestContext, token: string) =>
    request.get(`${e2eScenario.apiUrl}/Usuarios`, {
      headers: { Authorization: `Bearer ${token}` },
    });

  const listMailpitMessageIds = async (
    request: APIRequestContext
  ): Promise<Set<string>> => {
    const response = await request.get(`${e2eScenario.smtpUrl}/api/v1/messages`);
    if (!response.ok()) return new Set();
    const mailbox = (await response.json()) as MailpitMessagesResponse;
    return new Set(mailbox.messages.map((message) => message.ID));
  };

  const findMailpitTokenForRecipient = async (
    request: APIRequestContext,
    recipient: string,
    ignoredMessageIds: Set<string>
  ): Promise<string> => {
    let token: string | undefined;
    await expect
      .poll(
        async () => {
          const response = await request.get(
            `${e2eScenario.smtpUrl}/api/v1/messages`
          );
          if (!response.ok()) return false;

          const mailbox = (await response.json()) as MailpitMessagesResponse;
          const candidate = mailbox.messages.find(
            (message) =>
              !ignoredMessageIds.has(message.ID) &&
              message.To?.some(
                (address) =>
                  address.Address?.toLowerCase() === recipient.toLowerCase()
              )
          );
          if (!candidate) return false;

          const detailResponse = await request.get(
            `${e2eScenario.smtpUrl}/api/v1/message/${candidate.ID}`
          );
          if (!detailResponse.ok()) return false;
          const detail = (await detailResponse.json()) as MailpitMessage;
          token = detail.Text?.match(/[A-Za-z0-9_-]{43}/)?.[0];
          return Boolean(token);
        },
        { timeout: 30_000 }
      )
      .toBe(true);

    return token!;
  };

  test('credenciais: login habilitado aceita conta do cenário e recusa senha inválida', async ({
    page,
  }) => {
    await page.goto('/');

    await submitLogin(page, 'Synthetic invalid password 2026!', 401);
    await expect(page).toHaveURL(/\/$/);
    expect((await page.context().cookies()).map((cookie) => cookie.name)).not.toContain(
      'doorKey'
    );

    const login = await submitLogin(
      page,
      e2eScenario.administrator.password,
      200
    );
    expect(login?.requiresPasswordChange).toBe(false);
    await expect(page).toHaveURL(/\/admin\/?$/);
    expect((await page.context().cookies()).map((cookie) => cookie.name)).toContain(
      'doorKey'
    );
  });

  test('credenciais: troca de senha revoga sessão anterior pela interface', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    const firstSession = await submitLogin(
      page,
      e2eScenario.administrator.password,
      200
    );
    expect(firstSession?.token).toBeDefined();
    const secondSessionResponse = await request.post(
      `${e2eScenario.apiUrl}/Auth/login`,
      {
        data: {
          email: e2eScenario.administrator.email,
          password: e2eScenario.administrator.password,
        },
      }
    );
    expect(secondSessionResponse.status()).toBe(200);
    const secondSession = (await secondSessionResponse.json()) as LoginResponse;
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Alterar senha' })).toBeVisible();

    await page.locator('#current-password').fill('Synthetic wrong password 2026!');
    await page.locator('#new-password').fill(changedPassword);
    await page.locator('#password-confirmation').fill(changedPassword);
    const invalidChange = page.waitForResponse(
      (response) =>
        response.url() === `${e2eScenario.apiUrl}/Auth/change-password` &&
        response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    expect((await invalidChange).status()).toBe(400);
    await expect(page).toHaveURL(/\/admin\/settings$/);

    await page.locator('#current-password').fill(e2eScenario.administrator.password);
    const validChange = page.waitForResponse(
      (response) =>
        response.url() === `${e2eScenario.apiUrl}/Auth/change-password` &&
        response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    expect((await validChange).status()).toBe(204);
    await expect(page).toHaveURL(/\/$/);
    expect((await authorizedRequest(request, firstSession!.token)).status()).toBe(401);
    expect((await authorizedRequest(request, secondSession.token)).status()).toBe(401);

    const newSession = await submitLogin(page, changedPassword, 200);
    expect(newSession?.requiresPasswordChange).toBe(false);
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test('credenciais: recuperação seleciona o e-mail do cenário no Mailpit', async ({
    page,
    request,
  }) => {
    const existingMessageIds = await listMailpitMessageIds(request);
    await page.goto('/forgot-your-password');
    await page
      .getByLabel('Email', { exact: true })
      .fill(e2eScenario.administrator.email);
    const resetRequest = page.waitForResponse(
      (response) =>
        response.url() === `${e2eScenario.apiUrl}/Email/request-password-reset` &&
        response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Enviar e-mail de recuperação' }).click();
    expect((await resetRequest).status()).toBe(202);
    await expect(page).toHaveURL(/\/reset-password$/);

    const token = await findMailpitTokenForRecipient(
      request,
      e2eScenario.administrator.email,
      existingMessageIds
    );
    await page.getByLabel('Email', { exact: true }).fill(e2eScenario.administrator.email);
    await page.getByLabel('Token recebido por e-mail').fill(token);
    await page.locator('input[name="newPassword"]').fill(resetPassword);
    await page.locator('input[name="confirmation"]').fill(resetPassword);
    const resetResponse = page.waitForResponse(
      (response) =>
        response.url() === `${e2eScenario.apiUrl}/Email/reset-password` &&
        response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Atualizar senha' }).click();
    expect((await resetResponse).status()).toBe(204);
    await expect(page).toHaveURL(/\/$/);

    const login = await submitLogin(page, resetPassword, 200);
    expect(login?.requiresPasswordChange).toBe(false);
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test('credenciais: logout remove a sessao da conta do cenario', async ({
    page,
  }) => {
    await page.goto('/');
    await submitLogin(page, e2eScenario.administrator.password, 200);
    await expect(page).toHaveURL(/\/admin\/?$/);

    await page
      .getByRole('button', { name: new RegExp(e2eScenario.administrator.email, 'i') })
      .click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/admin/');
    await expect(page).toHaveURL(/\/$/);
    const authCookieNames = (await page.context().cookies()).map(
      (cookie) => cookie.name
    );
    expect(authCookieNames).not.toContain('doorKey');
    expect(authCookieNames).not.toContain('rankID');
    expect(authCookieNames).not.toContain('level');
  });
});
