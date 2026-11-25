import { expect, test } from './security-passive-capture';
import { securityE2eData } from './security-e2e-data';

test('serves the CSP frontend and protected API through the real same-origin proxy', async ({
  page,
  request,
}) => {
  await expect
    .poll(
      async () => {
        try {
          const response = await request.get('/');
          return response.status();
        } catch {
          return 0;
        }
      },
      { timeout: 45_000, intervals: [250, 500, 1_000, 2_000] }
    )
    .toBe(200);

  for (const route of securityE2eData.frontendRoutes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.evaluate(async () => document.fonts.ready);

    const policy = response?.headers()['content-security-policy'];
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toContain("'unsafe-eval'");
    await expect(page.locator('body')).toBeVisible();
  }

  const apiResult = await page.evaluate(async (apiPath) => {
    const response = await fetch(apiPath, { credentials: 'omit' });
    await response.arrayBuffer();
    return {
      status: response.status,
      url: response.url,
      origin: window.location.origin,
      contentSecurityPolicy: response.headers.get('content-security-policy'),
      allowOrigin: response.headers.get('access-control-allow-origin'),
    };
  }, securityE2eData.protectedApiPath);

  expect(apiResult.status).toBe(401);
  expect(apiResult.url).toBe(
    new URL(securityE2eData.protectedApiPath, securityE2eData.baseURL).href
  );
  expect(apiResult.origin).toBe(securityE2eData.baseURL);
  expect(apiResult.contentSecurityPolicy).toBe(
    "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  );
  expect(apiResult.allowOrigin).toBeNull();
});
