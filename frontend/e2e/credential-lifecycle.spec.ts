import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:18080/api';
const smtpApiUrl = process.env.E2E_SMTP_API_URL ?? 'http://127.0.0.1:18025';

const administrator = {
  email: 'synthetic-e2e-admin@example.invalid',
  initialPassword: 'synthetic-e2e-admin-password',
  firstPassword: 'Synthetic E2E First Password 2026!',
  changedPassword: 'Synthetic E2E Changed Password 2026!',
  resetPassword: 'Synthetic E2E Reset Password 2026!',
};

type LoginResponse = {
  token: string;
  requiresPasswordChange: boolean;
};

type MailpitMessagesResponse = {
  messages: Array<{ ID: string }>;
};

type MailpitMessage = {
  Text: string;
};

test.setTimeout(90_000);

test('exercises the seeded administrator credential lifecycle and session revocation', async ({
  page,
  request,
}) => {
  const signIn = async (password: string): Promise<LoginResponse> => {
    const response = await request.post(`${apiBaseUrl}/Auth/login`, {
      data: { email: administrator.email, password },
    });

    expect(response.status()).toBe(200);
    return response.json() as Promise<LoginResponse>;
  };

  const authorizedRequest = (token: string) =>
    request.get(`${apiBaseUrl}/Usuarios`, {
      headers: { Authorization: `Bearer ${token}` },
    });

  const requestResetToken = async (): Promise<string> => {
    const clearMailbox = await request.delete(`${smtpApiUrl}/api/v1/messages`);
    expect(clearMailbox.ok()).toBe(true);

    const resetRequest = await request.post(
      `${apiBaseUrl}/Email/request-password-reset`,
      { data: { email: administrator.email } }
    );
    expect(resetRequest.status()).toBe(202);

    let messageId: string | undefined;
    await expect
      .poll(async () => {
        const response = await request.get(`${smtpApiUrl}/api/v1/messages`);
        if (!response.ok()) {
          return undefined;
        }

        const mailbox = (await response.json()) as MailpitMessagesResponse;
        messageId = mailbox.messages[0]?.ID;
        return messageId;
      })
      .toBeTruthy();

    const messageResponse = await request.get(
      `${smtpApiUrl}/api/v1/message/${messageId}`
    );
    expect(messageResponse.ok()).toBe(true);
    const message = (await messageResponse.json()) as MailpitMessage;
    const token = message.Text.match(/[A-Za-z0-9_-]{43}/)?.[0];

    expect(token).toBeDefined();
    return token!;
  };

  const requiredSessionA = await signIn(administrator.initialPassword);
  const requiredSessionB = await signIn(administrator.initialPassword);
  expect(requiredSessionA.requiresPasswordChange).toBe(true);
  expect(requiredSessionB.requiresPasswordChange).toBe(true);
  expect((await authorizedRequest(requiredSessionA.token)).status()).toBe(403);

  await page.goto('/');
  await page.locator('input[name="email"]').fill(administrator.email);
  await page.locator('input[name="password"]').fill(administrator.initialPassword);
  await page.getByRole('button', { name: 'Submeter Login' }).click();
  await expect(page).toHaveURL(/\/change-password-required$/);
  await expect(
    page.getByRole('heading', { name: 'Defina uma nova senha' })
  ).toBeVisible();

  await page.locator('#current-password').fill(administrator.initialPassword);
  await page.locator('#new-password').fill(administrator.firstPassword);
  await page
    .locator('#password-confirmation')
    .fill(administrator.firstPassword);
  await page.getByRole('button', { name: 'Alterar senha' }).click();
  await expect(page).toHaveURL(/\/$/);

  expect((await authorizedRequest(requiredSessionA.token)).status()).toBe(401);
  expect((await authorizedRequest(requiredSessionB.token)).status()).toBe(401);

  const completedSessionA = await signIn(administrator.firstPassword);
  const completedSessionB = await signIn(administrator.firstPassword);
  expect(completedSessionA.requiresPasswordChange).toBe(false);
  expect(completedSessionB.requiresPasswordChange).toBe(false);
  expect((await authorizedRequest(completedSessionA.token)).ok()).toBe(true);

  await page.locator('input[name="email"]').fill(administrator.email);
  await page.locator('input[name="password"]').fill(administrator.firstPassword);
  await page.getByRole('button', { name: 'Submeter Login' }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();

  await page.locator('#current-password').fill(administrator.firstPassword);
  await page.locator('#new-password').fill(administrator.changedPassword);
  await page
    .locator('#password-confirmation')
    .fill(administrator.changedPassword);
  await page.getByRole('button', { name: 'Alterar senha' }).click();
  await expect(page).toHaveURL(/\/$/);

  expect((await authorizedRequest(completedSessionA.token)).status()).toBe(401);
  expect((await authorizedRequest(completedSessionB.token)).status()).toBe(401);

  const resetSessionA = await signIn(administrator.changedPassword);
  const resetSessionB = await signIn(administrator.changedPassword);
  const resetToken = await requestResetToken();
  const resetResponse = await request.post(`${apiBaseUrl}/Email/reset-password`, {
    data: {
      email: administrator.email,
      code: resetToken,
      newPassword: administrator.resetPassword,
      confirmation: administrator.resetPassword,
    },
  });
  expect(resetResponse.status()).toBe(204);
  expect((await authorizedRequest(resetSessionA.token)).status()).toBe(401);
  expect((await authorizedRequest(resetSessionB.token)).status()).toBe(401);

  await page.locator('input[name="email"]').fill(administrator.email);
  await page.locator('input[name="password"]').fill(administrator.resetPassword);
  await page.getByRole('button', { name: 'Submeter Login' }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.evaluate(() => {
    localStorage.setItem('sidebar-open-items', '{"Operações":true}');
    document.cookie = 'sidebar_state=false; path=/';
  });
  await page
    .getByRole('button', { name: /synthetic-e2e-admin@example\.invalid/i })
    .click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/admin/');
  await expect(page).toHaveURL(/\/$/);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        cookies: document.cookie,
        sidebarItems: localStorage.getItem('sidebar-open-items'),
      }))
    )
    .toEqual({
      cookies: expect.stringContaining('sidebar_state=false'),
      sidebarItems: '{"Operações":true}',
    });

  const authCookieNames = (await page.context().cookies()).map(
    (cookie) => cookie.name
  );
  expect(authCookieNames).not.toContain('doorKey');
  expect(authCookieNames).not.toContain('rankID');
  expect(authCookieNames).not.toContain('level');
});
