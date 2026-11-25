import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

test('mantém a sessão segura, retoma a rota e diferencia 401 de 403', async ({
  page,
}) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));

  let shouldExpire = true;
  let shouldForbid = false;
  let problemStatus: 400 | 404 | 409 | 413 | undefined;
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/Auth/login') || url.includes('/Emprestimos/13013')) {
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
        requiresPasswordChange: false,
      }),
    });
  });
  await page.route('**/api/Auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: '13013',
        role: 'Mentor',
        requiresPasswordChange: false,
        csrfToken: 'error-experience-session-csrf-proof',
      }),
    });
  });
  await page.route('**/api/Emprestimos/13013', async (route) => {
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

    if (problemStatus) {
      const codes = {
        400: 'validation_failed',
        404: 'resource_not_found',
        409: 'operation_conflict',
        413: 'request_body_too_large',
      };
      await route.fulfill({
        status: problemStatus,
        contentType: 'application/problem+json; charset=utf-8',
        headers: { 'X-Correlation-ID': `server:typed-${problemStatus}` },
        body: JSON.stringify({
          status: problemStatus,
          code: codes[problemStatus],
          title: 'REMOTE_TYPED_TITLE_MUST_NOT_RENDER',
          detail: 'REMOTE_TYPED_DETAIL_MUST_NOT_RENDER',
          correlationId: `server:typed-${problemStatus}`,
          errors: problemStatus === 400 ? { dataValidade: ['REMOTE_TYPED_FIELD'] } : undefined,
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
        dataPrevistaDevolucao: null,
        dataDevolucao: '2026-09-08T10:00:00',
        dataAprovacao: null,
        status: 'Aprovado',
        produtos: [],
        solicitante: {
          id: 13013,
          nomeCompleto: 'Usuário sintético de experiência de erros',
          email: 'synthetic-mentor@example.invalid',
          telefone: null,
          dataIngresso: '2026-09-01',
          status: 'Habilitado',
          nivelUsuario: 'Mentorado',
          tipoUsuario: 'Academico',
          responsavel: null,
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

  await gotoProtectedRoute('/mentor/history/loan?id=13013&context=allowed#details');
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem('auth:session-context'))
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem('auth:csrf-token'))
  ).toBeNull();
  const clearedCookieNames = (await page.context().cookies()).map(
    (cookie) => cookie.name
  );
  expect(clearedCookieNames).not.toContain('doorKey');
  expect(clearedCookieNames).not.toContain('rankID');
  expect(clearedCookieNames).not.toContain('level');
  expect(consoleMessages.join('\n')).not.toContain('REMOTE_401_');

  await loginThroughUi();
  await expect(page).toHaveURL(
    /\/mentor\/history\/loan\?id=13013&context=allowed#details$/
  );
  await expect(page.getByRole('heading', { name: /Hist/ })).toBeVisible();

  shouldExpire = true;
  await gotoProtectedRoute('/mentor/history/loan?id=13013&context=unsafe#details');
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() =>
    sessionStorage.setItem('auth:intended-route', '//evil.example/steal')
  );
  await loginThroughUi();
  await expect(page).toHaveURL(/\/mentor\/?$/);

  shouldExpire = true;
  await gotoProtectedRoute('/mentor/history/loan?id=13013&context=other-profile#details');
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() =>
    sessionStorage.setItem('auth:intended-route', '/admin/settings')
  );
  await loginThroughUi();
  await expect(page).toHaveURL(/\/mentor\/?$/);

  shouldForbid = true;
  await gotoProtectedRoute('/mentor/history/loan?id=13013&context=forbidden#details');
  await expect(page).toHaveURL(
    /\/mentor\/history\/loan\?id=13013&context=forbidden#details$/
  );
  const feedback = page.getByRole('alert', {
    name: /n[aã]o foi possível carregar o empréstimo/i,
  });
  await expect(feedback).toContainText(/permiss/i);
  await expect(feedback).toContainText(/carregar/i);
  await expect(page.getByText(/REMOTE_403_/)).toHaveCount(0);
  expect(consoleMessages.join('\n')).not.toContain('REMOTE_403_');

  expect(
    await page.evaluate(() => sessionStorage.getItem('auth:session-context'))
  ).toContain('13013');
  expect(
    await page.evaluate(() => sessionStorage.getItem('auth:csrf-token'))
  ).toBe('error-experience-session-csrf-proof');

  shouldForbid = false;
  const publicProblems = [
    [400, 'Os dados informados precisam de revisão.'],
    [404, 'O recurso solicitado não foi encontrado.'],
    [409, 'O conteúdo foi alterado ou já processado.'],
    [413, 'A solicitação excede o tamanho permitido.'],
  ] as const;
  for (const [status, message] of publicProblems) {
    problemStatus = status;
    await gotoProtectedRoute(`/mentor/history/loan?id=13013&context=typed-${status}`);
    const typedFeedback = page.getByRole('alert', {
      name: /não foi possível carregar o empréstimo/i,
    });
    await expect(typedFeedback).toContainText(message);
    await expect(typedFeedback).toContainText(`server:typed-${status}`);
    if (status === 400) {
      await expect(typedFeedback.getByRole('list', { name: 'Campos para revisar' }))
        .toContainText('dataValidade');
    }
    if (status === 413) {
      await expect(typedFeedback).toContainText('Reduzir os dados enviados');
    }
    await expect(page.getByText(/REMOTE_TYPED_/)).toHaveCount(0);
  }
  expect(consoleMessages.join('\n')).not.toContain('REMOTE_TYPED_');
});
