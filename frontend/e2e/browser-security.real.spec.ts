import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { securityE2eData } from './infra/security-e2e-data';

type LoginResponse = {
  token: string;
  requiresPasswordChange: boolean;
};

type SeededUser = {
  id: number;
  email: string;
  nivelUsuario: string;
  status: string;
};

type SecurityIdentity = {
  email: string;
  password: string;
  role: 'Administrador' | 'Mentor' | 'Mentorado';
  id: number;
  token: string;
};

type CspViolation = {
  directive: string;
  blockedUri: string;
};

const adminEmail =
  process.env.SECURITY_E2E_ADMIN_EMAIL ?? 'synthetic-security-admin@example.invalid';
const initialAdminPassword =
  process.env.SECURITY_E2E_ADMIN_PASSWORD ?? 'synthetic-security-admin-password';
const rotatedAdminPassword = 'Security-E2E-Admin-Rotated-2026!';
const mentorEmail =
  process.env.SECURITY_E2E_MENTOR_EMAIL ?? 'synthetic-security-mentor@example.invalid';
const mentorPassword = 'Security-E2E-Mentor-Password-2026!';
const menteeEmail =
  process.env.SECURITY_E2E_MENTEE_EMAIL ?? 'synthetic-security-mentee@example.invalid';
const menteePassword = 'Security-E2E-Mentee-Password-2026!';

const authorization = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

async function login(
  request: APIRequestContext,
  email: string,
  password: string
) {
  return request.post('/api/Auth/login', { data: { email, password } });
}

async function authenticateAdmin(
  request: APIRequestContext
): Promise<SecurityIdentity> {
  let response = await login(request, adminEmail, initialAdminPassword);

  if (!response.ok()) {
    response = await login(request, adminEmail, rotatedAdminPassword);
  }

  if (!response.ok()) {
    throw new Error('The synthetic security administrator could not authenticate.');
  }

  let data = (await response.json()) as LoginResponse;
  if (data.requiresPasswordChange) {
    const changed = await request.post('/api/Auth/change-password', {
      headers: authorization(data.token),
      data: {
        currentPassword: initialAdminPassword,
        newPassword: rotatedAdminPassword,
        confirmation: rotatedAdminPassword,
      },
    });

    if (changed.status() !== 204) {
      throw new Error('The synthetic security administrator password rotation failed.');
    }

    response = await login(request, adminEmail, rotatedAdminPassword);
    if (!response.ok()) {
      throw new Error('The synthetic security administrator could not start a full session.');
    }
    data = (await response.json()) as LoginResponse;
  }

  if (data.requiresPasswordChange) {
    throw new Error('The synthetic security administrator still requires a password change.');
  }

  const usersResponse = await request.get('/api/Usuarios', {
    headers: authorization(data.token),
  });
  if (!usersResponse.ok()) {
    throw new Error('The synthetic security administrator could not read the seed registry.');
  }

  const users = (await usersResponse.json()) as SeededUser[];
  const admin = users.find((user) => user.email.toLowerCase() === adminEmail.toLowerCase());
  if (!admin) {
    throw new Error('The synthetic security administrator is missing from the seed registry.');
  }

  return {
    email: adminEmail,
    password: rotatedAdminPassword,
    role: 'Administrador',
    id: admin.id,
    token: data.token,
  };
}

async function ensureAcademicUser(
  request: APIRequestContext,
  admin: SecurityIdentity,
  user: { email: string; password: string; role: 'Mentor' | 'Mentorado'; responsibleEmail?: string }
): Promise<SecurityIdentity> {
  const listUsers = async () => {
    const response = await request.get('/api/Usuarios', {
      headers: authorization(admin.token),
    });
    if (!response.ok()) {
      throw new Error('The security scenario could not read its synthetic users.');
    }
    return (await response.json()) as SeededUser[];
  };

  let users = await listUsers();
  let existing = users.find((candidate) => candidate.email.toLowerCase() === user.email.toLowerCase());

  if (!existing) {
    const created = await request.post('/api/Usuarios', {
      data: {
        nomeCompleto: user.role === 'Mentor' ? 'Security E2E Mentor' : 'Security E2E Mentee',
        email: user.email,
        senha: user.password,
        telefone: user.role === 'Mentor' ? '81900000001' : '81900000002',
        nivelUsuario: user.role,
        tipoUsuario: 'Academico',
        instituicao: 'IFPE',
        cidade: 'Recife',
        curso: 'Agronomia',
        responsavelEmail: user.responsibleEmail,
      },
    });

    if (created.status() !== 201) {
      throw new Error(`The synthetic ${user.role.toLowerCase()} registration failed.`);
    }

    users = await listUsers();
    existing = users.find((candidate) => candidate.email.toLowerCase() === user.email.toLowerCase());
  }

  if (!existing) {
    throw new Error(`The synthetic ${user.role.toLowerCase()} is missing from the seed registry.`);
  }

  if (existing.status !== 'Habilitado') {
    const approved = await request.patch(`/api/Usuarios/${existing.id}/aprovar`, {
      headers: authorization(admin.token),
    });
    if (!approved.ok()) {
      throw new Error(`The synthetic ${user.role.toLowerCase()} could not be approved.`);
    }
  }

  const authenticated = await login(request, user.email, user.password);
  if (!authenticated.ok()) {
    throw new Error(`The synthetic ${user.role.toLowerCase()} could not authenticate.`);
  }
  const loginData = (await authenticated.json()) as LoginResponse;
  if (loginData.requiresPasswordChange) {
    throw new Error(`The synthetic ${user.role.toLowerCase()} requires a password change.`);
  }

  return {
    email: user.email,
    password: user.password,
    role: user.role,
    id: existing.id,
    token: loginData.token,
  };
}

async function provisionSecurityIdentities(request: APIRequestContext) {
  const admin = await authenticateAdmin(request);
  const mentor = await ensureAcademicUser(request, admin, {
    email: mentorEmail,
    password: mentorPassword,
    role: 'Mentor',
  });
  const mentee = await ensureAcademicUser(request, admin, {
    email: menteeEmail,
    password: menteePassword,
    role: 'Mentorado',
    responsibleEmail: mentorEmail,
  });

  return { admin, mentor, mentee };
}

async function startBrowserSession(
  context: BrowserContext,
  identity: SecurityIdentity
) {
  await context.clearCookies();
  await context.addCookies(
    [
      ['doorKey', identity.token],
      ['rankID', String(identity.id)],
      ['level', identity.role],
    ].map(([name, value]) => ({
      name,
      value,
      url: securityE2eData.baseURL,
      secure: true,
      sameSite: 'Strict' as const,
    }))
  );
}

async function expectNoUnexpectedPolicyViolations(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.fonts.status)).toBe('loaded');
  const violations = await page.evaluate(
    () => (window as Window & { __securityCspViolations?: CspViolation[] }).__securityCspViolations ?? []
  );
  // Zod v4 deliberately probes Function(""), catches the CSP rejection and continues.
  const expectedZodProbe = violations.filter(
    (violation) => violation.directive === 'script-src' && violation.blockedUri === 'eval'
  );
  expect(expectedZodProbe).toHaveLength(1);
  const unexpected = violations.filter(
    (violation) => !(violation.directive === 'script-src' && violation.blockedUri === 'eval')
  );
  expect(unexpected).toEqual([]);
}

async function assertDeniedCORS(
  page: Page,
  target: string,
  expectedOrigin: string,
  useOpaqueOrigin = false
) {
  const deniedRequest = page.waitForRequest((request) => request.url() === target);
  const failedRequest = page.waitForEvent(
    'requestfailed',
    (request) => request.url() === target
  );

  const fetchResult = useOpaqueOrigin
    ? await page.evaluate(
        () =>
          new Promise<{ readable: boolean; errorName?: string; status?: number }>((resolve) => {
            const frame = document.createElement('iframe');
            frame.setAttribute('sandbox', 'allow-scripts');
            frame.src = 'https://security-cors-attacker.invalid/opaque-child';
            const onMessage = (event: MessageEvent) => {
              if (event.source !== frame.contentWindow) return;
              window.removeEventListener('message', onMessage);
              resolve(event.data as { readable: boolean; errorName?: string; status?: number });
              frame.remove();
            };
            window.addEventListener('message', onMessage);
            document.body.append(frame);
          })
      )
    : await page.evaluate(async (apiUrl) => {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'synthetic-cors-probe@example.invalid' }),
          });
          return { readable: true, status: response.status };
        } catch (error) {
          return { readable: false, errorName: error instanceof Error ? error.name : 'unknown' };
        }
      }, target);

  const request = await deniedRequest;
  const failure = await failedRequest;
  expect(request.headers().origin).toBe(expectedOrigin);
  expect(failure.failure()?.errorText).toBeTruthy();
  expect(fetchResult.readable).toBe(false);
  expect(fetchResult.errorName).toBe('TypeError');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & { __securityCspViolations?: CspViolation[] };
    target.__securityCspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      target.__securityCspViolations?.push({
        directive: event.effectiveDirective,
        blockedUri: event.blockedURI,
      });
    });
  });
});

test('serves applied CSP on SPA routes and blocks controlled active resources', async ({ page }) => {
  await page.route('**/csp-dynamic-eval-probe.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: `
        window.__cspEvalRan = false;
        try { eval('window.__cspEvalRan = true'); } catch {}
        window.__cspFunctionRan = false;
        try { new Function('window.__cspFunctionRan = true')(); } catch {}
      `,
    })
  );

  for (const route of ['/', '/login', '/forgot-your-password', '/reset-password', '/create-account']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const policy = response?.headers()['content-security-policy'];
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(policy).toContain("connect-src 'self' data:");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-src 'none'");
    expect(policy).toContain("frame-ancestors 'self'");
    await expect(page.locator('body')).toBeVisible();
    await expectNoUnexpectedPolicyViolations(page);
  }

  await page.goto('/login');
  await page.evaluate(() => {
    const violationTarget = window as Window & { __securityCspViolations?: CspViolation[] };
    violationTarget.__securityCspViolations = [];

    const inlineScript = document.createElement('script');
    inlineScript.textContent = 'window.__cspInlineScriptRan = true';
    document.body.append(inlineScript);

    const externalScript = document.createElement('script');
    externalScript.src = 'https://security-csp-probe.invalid/probe.js';
    document.body.append(externalScript);

    const eventHandler = document.createElement('button');
    eventHandler.setAttribute('onclick', 'window.__cspInlineHandlerRan = true');
    document.body.append(eventHandler);
    eventHandler.click();

    const dynamicScript = document.createElement('script');
    dynamicScript.src = '/csp-dynamic-eval-probe.js';
    document.body.append(dynamicScript);

    const image = document.createElement('img');
    image.src = 'https://security-csp-probe.invalid/probe.png';
    document.body.append(image);

    const frame = document.createElement('iframe');
    frame.src = 'https://security-csp-probe.invalid/frame';
    document.body.append(frame);

    const object = document.createElement('object');
    object.data = 'https://security-csp-probe.invalid/object';
    document.body.append(object);

    const base = document.createElement('base');
    base.href = 'https://security-csp-probe.invalid/';
    document.head.append(base);

    const form = document.createElement('form');
    form.action = 'https://security-csp-probe.invalid/submit';
    form.method = 'post';
    const submit = document.createElement('button');
    submit.type = 'submit';
    form.append(submit);
    document.body.append(form);
    form.requestSubmit();

    void fetch('https://security-csp-probe.invalid/connect').catch(() => undefined);

    try {
      const workerSource = new Blob(['self.postMessage("blocked")'], {
        type: 'text/javascript',
      });
      const workerUrl = URL.createObjectURL(workerSource);
      const worker = new Worker(workerUrl);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    } catch {
      // The CSP browser event is the assertion; a blocked Worker can throw synchronously.
    }
  });

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __securityCspViolations?: CspViolation[] }).__securityCspViolations ?? []
      )
    )
    .toEqual(
      expect.arrayContaining(
        [
          'script-src-elem',
          'script-src-attr',
          'img-src',
          'frame-src',
          'object-src',
          'base-uri',
          'form-action',
          'connect-src',
        ].map((directive) => expect.objectContaining({ directive }))
      )
    );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __securityCspViolations?: CspViolation[] }).__securityCspViolations?.filter(
            (violation) => violation.directive === 'script-src' && violation.blockedUri === 'eval'
          ).length ?? 0
      )
    )
    .toBeGreaterThanOrEqual(2);
  const probe = await page.evaluate(() => ({
    inlineScriptRan: Boolean((window as Window & { __cspInlineScriptRan?: boolean }).__cspInlineScriptRan),
    inlineHandlerRan: Boolean((window as Window & { __cspInlineHandlerRan?: boolean }).__cspInlineHandlerRan),
    evalRan: Boolean((window as Window & { __cspEvalRan?: boolean }).__cspEvalRan),
    functionRan: Boolean((window as Window & { __cspFunctionRan?: boolean }).__cspFunctionRan),
    currentUrl: window.location.href,
    documentBase: document.baseURI,
  }));
  expect(probe.inlineScriptRan).toBe(false);
  expect(probe.inlineHandlerRan).toBe(false);
  expect(probe.evalRan).toBe(false);
  expect(probe.functionRan).toBe(false);
  expect(probe.currentUrl).toBe(new URL('/login', securityE2eData.baseURL).href);
  expect(probe.documentBase).toBe(new URL('/login', securityE2eData.baseURL).href);
});

test('keeps same-origin API calls readable while external and null origins fail CORS', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/login');
  const sameOriginApi = await page.evaluate(async (path) => {
    const response = await fetch(path);
    return {
      status: response.status,
      csp: response.headers.get('content-security-policy'),
      allowOrigin: response.headers.get('access-control-allow-origin'),
    };
  }, securityE2eData.protectedApiPath);
  expect(sameOriginApi.status).toBe(401);
  expect(sameOriginApi.csp).toBeNull();
  expect(sameOriginApi.allowOrigin).toBeNull();

  const crossOriginPage = await context.newPage();
  await crossOriginPage.route('https://security-cors-attacker.invalid/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>external origin</title>' })
  );
  await crossOriginPage.goto('https://security-cors-attacker.invalid/');
  const target = new URL('/api/Email/request-password-reset', securityE2eData.baseURL).href;
  await assertDeniedCORS(crossOriginPage, target, 'https://security-cors-attacker.invalid');

  const nullOriginPage = await context.newPage();
  await nullOriginPage.route('https://security-cors-attacker.invalid/**', (route) => {
    if (new URL(route.request().url()).pathname !== '/opaque-child') {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>external origin</title>',
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><script>
        const target = ${JSON.stringify(target)};
        fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'synthetic-cors-probe@example.invalid' })
        }).then(response => parent.postMessage({ readable: true, status: response.status }, '*'))
          .catch(error => parent.postMessage({ readable: false, errorName: error.name }, '*'));
      </script><title>opaque child origin</title>`,
    });
  });
  await nullOriginPage.goto('https://security-cors-attacker.invalid/opaque');
  await assertDeniedCORS(nullOriginPage, target, 'null', true);

  for (const origin of ['https://security-cors-attacker.invalid', 'null']) {
    const preflight = await request.fetch(target, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(preflight.status()).toBe(405);
    expect(preflight.headers()['access-control-allow-origin']).toBeUndefined();
  }

  await crossOriginPage.close();
  await nullOriginPage.close();
});

test('keeps the three profile routes, recovery flow, images, fonts and exports working under CSP', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(90_000);
  const identities = await provisionSecurityIdentities(request);

  const profiles = [
    { identity: identities.admin, path: '/admin/profile' },
    { identity: identities.mentor, path: '/mentor/profile' },
    { identity: identities.mentee, path: '/mentee/profile' },
  ];

  const fontResponses: number[] = [];
  page.on('response', (response) => {
    if (/\.(?:ttf|otf|woff2?)(?:[?#]|$)/i.test(response.url())) fontResponses.push(response.status());
  });

  for (const profile of profiles) {
    await startBrowserSession(context, profile.identity);
    const response = await page.goto(profile.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Perfil', exact: true })).toBeVisible();
    await expectNoUnexpectedPolicyViolations(page);

    const localAssets = await page.evaluate(async () => {
      await document.fonts.ready;
      const images = Array.from(document.images);
      return {
        loadedInter: document.fonts.check('16px "inter-regular"'),
        loadedRajdhani: document.fonts.check('16px "rajdhani-medium"'),
        localImages: images.every((image) => image.complete && image.naturalWidth > 0),
      };
    });
    expect(localAssets.loadedInter).toBe(true);
    expect(localAssets.loadedRajdhani).toBe(true);
    expect(localAssets.localImages).toBe(true);
  }

  expect(fontResponses.length).toBeGreaterThan(0);
  expect(fontResponses.every((status) => status === 200)).toBe(true);

  await page.goto('/forgot-your-password');
  await page.getByLabel('Email').fill('synthetic-recovery-probe@example.invalid');
  const recoveryResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/Email/request-password-reset') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Enviar e-mail de recuperação' }).click();
  expect((await recoveryResponse).status()).toBe(202);
  await expect(page).toHaveURL(/\/reset-password$/);
  await expectNoUnexpectedPolicyViolations(page);

  await startBrowserSession(context, identities.admin);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Usuários Cadastrados' })).toBeVisible();
  await expectNoUnexpectedPolicyViolations(page);

  await page.getByRole('button', { name: 'Opções de exportação' }).click();
  const [excelDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Excel' }).click(),
  ]);
  expect(excelDownload.suggestedFilename()).toBe('usuarios.xlsx');
  expect(await excelDownload.failure()).toBeNull();

  await page.getByRole('button', { name: 'Opções de exportação' }).click();
  const pdfButton = page.getByRole('button', { name: 'PDF', exact: true });
  await expect(pdfButton).toBeVisible();
  const pdfDownloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
  await pdfButton.click({ force: true });
  const pdfDownload = await pdfDownloadPromise;
  if (!pdfDownload) {
    const diagnostics = await page.evaluate(() => {
      const target = window as Window & { __securityCspViolations?: CspViolation[] };
      return {
        cspViolations: target.__securityCspViolations ?? [],
        exportBusy: document.querySelector<HTMLButtonElement>('button[aria-label="Exportar Excel"]')?.disabled,
      };
    });
    throw new Error(`The PDF export did not start a browser download: ${JSON.stringify(diagnostics)}`);
  }
  expect(pdfDownload.suggestedFilename()).toBe('usuarios_cadastrados.pdf');
  expect(await pdfDownload.failure()).toBeNull();
  await expectNoUnexpectedPolicyViolations(page);
});

test('does not trust client-forged X-Forwarded-For at the proxy edge', async ({ page }) => {
  await page.goto('/login');

  const statuses = await page.evaluate(async () => {
    const results: number[] = [];
    for (let attempt = 1; attempt <= 31; attempt += 1) {
      const response = await fetch('/api/Auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `203.0.113.${attempt}`,
        },
        body: JSON.stringify({
          email: `synthetic-xff-probe-${attempt}@example.invalid`,
          password: 'Invalid-Synthetic-Password-2026!',
        }),
      });
      results.push(response.status);
    }
    return results;
  });

  expect(statuses.slice(0, 30)).toEqual(Array.from({ length: 30 }, () => 401));
  expect(statuses[30]).toBe(429);
});
