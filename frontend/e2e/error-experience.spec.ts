import { expect, test } from '@playwright/test';

const syntheticLoginToken = (): string => {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' })
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: '13013',
      role: 'Mentor',
      password_change_required: false,
    })
  ).toString('base64url');

  return `${header}.${payload}.synthetic-e2e-signature`;
};

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

test('mantém a sessão segura, retoma a rota e diferencia 401 de 403', async ({
  page,
}) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));

  let shouldExpire = true;
  let shouldForbid = false;
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/Auth/login') || url.includes('/Emprestimos/undefined')) {
      await route.fallback();
      return;
    }

    let body = '[]';
    if (url.includes('/Notificacoes/count')) body = '0';
    if (url.includes('/Usuarios/13013')) {
      body = JSON.stringify({
        id: 13013,
        nomeCompleto: 'Usuário sintético de experiência de erros',
        email: 'synthetic-mentor@example.invalid',
        nivelUsuario: 'Mentor',
      });
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    });
  });
  await page.route('**/Auth/login**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: syntheticLoginToken(),
        requiresPasswordChange: false,
      }),
    });
  });
  await page.route('**/api/Emprestimos/undefined', async (route) => {
    if (shouldExpire) {
      shouldExpire = false;
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'REMOTE_401_TITLE_MUST_NOT_RENDER',
          detail: 'REMOTE_401_DETAIL_MUST_NOT_RENDER',
          traceId: 'e2e:401-safe-reference',
        }),
      });
      return;
    }

    if (shouldForbid) {
      await route.fulfill({
        status: 403,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'REMOTE_403_TITLE_MUST_NOT_RENDER',
          detail: 'REMOTE_403_DETAIL_MUST_NOT_RENDER',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 13013,
        dataRealizacao: '2026-09-07T10:00:00',
        dataDevolucao: '2026-09-08T10:00:00',
        dataAprovacao: null,
        status: 'Aprovado',
        produtos: [],
        solicitante: {
          id: 13013,
          nomeCompleto: 'Usuário sintético de experiência de erros',
          email: 'synthetic-mentor@example.invalid',
        },
        aprovador: null,
      }),
    });
  });

  const loginThroughUi = async () => {
    await expect(page).toHaveURL(/\/$/);
    await page.locator('input[name="email"]').fill('synthetic-mentor@example.invalid');
    await page.locator('input[name="password"]').fill('Synthetic E2E Login Password 2026!');
    await page.getByRole('button', { name: 'Submeter Login' }).click();
  };

  const gotoProtectedRoute = async (path: string) => {
    try {
      await page.goto(path);
    } catch (error) {
      if (!String(error).includes('ERR_ABORTED')) throw error;
    }
  };

  await page.goto('/');
  await page.locator('input[name="email"]').fill('synthetic-mentor@example.invalid');
  await page.locator('input[name="password"]').fill('Synthetic E2E Login Password 2026!');
  await page.getByRole('button', { name: 'Submeter Login' }).click();
  await expect(page).toHaveURL(/\/mentor\/?$/);

  await gotoProtectedRoute('/mentor/history/loan?context=allowed#details');
  await expect(page).toHaveURL(/\/$/);
  const clearedCookieNames = (await page.context().cookies()).map(
    (cookie) => cookie.name
  );
  expect(clearedCookieNames).not.toContain('doorKey');
  expect(clearedCookieNames).not.toContain('rankID');
  expect(clearedCookieNames).not.toContain('level');
  expect(consoleMessages.join('\n')).not.toContain('REMOTE_401_');

  await loginThroughUi();
  await expect(page).toHaveURL(
    /\/mentor\/history\/loan\?context=allowed#details$/
  );
  await expect(page.getByRole('heading', { name: /Hist/ })).toBeVisible();

  shouldExpire = true;
  await gotoProtectedRoute('/mentor/history/loan?context=unsafe#details');
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() =>
    sessionStorage.setItem('auth:intended-route', '//evil.example/steal')
  );
  await loginThroughUi();
  await expect(page).toHaveURL(/\/mentor\/?$/);

  shouldExpire = true;
  await gotoProtectedRoute('/mentor/history/loan?context=other-profile#details');
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() =>
    sessionStorage.setItem('auth:intended-route', '/admin/settings')
  );
  await loginThroughUi();
  await expect(page).toHaveURL(/\/mentor\/?$/);

  shouldForbid = true;
  await gotoProtectedRoute('/mentor/history/loan?context=forbidden#details');
  await expect(page).toHaveURL(
    /\/mentor\/history\/loan\?context=forbidden#details$/
  );
  const feedback = page.getByRole('alert');
  await expect(feedback).toContainText(/permiss/i);
  await expect(feedback).toContainText(/carregar/i);
  await expect(page.getByText(/REMOTE_403_/)).toHaveCount(0);
  expect(consoleMessages.join('\n')).not.toContain('REMOTE_403_');

  const retainedCookieNames = (await page.context().cookies()).map(
    (cookie) => cookie.name
  );
  expect(retainedCookieNames).toContain('doorKey');
  expect(retainedCookieNames).toContain('rankID');
  expect(retainedCookieNames).toContain('level');
});
