import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:18080/api';
const administratorEmail = 'synthetic-e2e-admin@example.invalid';

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.invalid`;

const academicPayload = (overrides: Record<string, unknown> = {}) => ({
  nomeCompleto: 'Pessoa Sintetica E2E',
  email: uniqueEmail('academic'),
  senha: 'Synthetic User Data Password 2026!',
  telefone: '81999999999',
  nivelUsuario: 'Mentor',
  tipoUsuario: 'Academico',
  instituicao: 'IFPE',
  cidade: 'Belo Jardim',
  curso: 'ES',
  responsavelEmail: administratorEmail,
  ...overrides,
});

test.setTimeout(90_000);

test('cadastra academico com cidade real e curso curto normalizados', async ({
  page,
}) => {
  await page.goto('/create-account');

  await page.getByText('Tipo', { exact: true }).click();
  await page.getByRole('option', { name: 'Mentor', exact: true }).click();
  await page.getByLabel('Nome Completo').fill('Pessoa Sintetica E2E');
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail('browser'));
  await page.locator('input[name="senha"]').fill('Synthetic User Data Password 2026!');
  await page.locator('input[name="repeat"]').fill('Synthetic User Data Password 2026!');
  await page.getByLabel('Instituição').fill('IFPE');
  await page.getByLabel('Curso').fill('  ES  ');
  await page.getByLabel('Cidade').fill('  Belo Jardim  ');
  await page.getByLabel('Telefone').fill('81999999999');
  await page.getByLabel('Email do Mentor Responsável').fill(administratorEmail);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${apiBaseUrl}/Usuarios` &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Criar Conta' }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(201);
  const requestBody = response.request().postDataJSON();
  expect(requestBody).toMatchObject({ cidade: 'Belo Jardim', curso: 'ES' });
  expect(requestBody.cidade).not.toBe('Indefinido');
  const body = await response.json();
  expect(body.dataIngresso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('API rejeita cidade e curso invalidos com Problem Details por campo', async ({
  request,
}) => {
  const invalid = await request.post(`${apiBaseUrl}/Usuarios`, {
    data: academicPayload({ cidade: '   ', curso: 'E' }),
  });

  expect(invalid.status()).toBe(400);
  expect(invalid.headers()['content-type']).toContain('application/problem+json');
  const invalidBody = await invalid.json();
  expect(invalidBody.errors).toMatchObject({
    cidade: ['Informe uma cidade válida.'],
    curso: ['O curso deve ter entre 2 e 100 caracteres.'],
  });

  const sentinel = await request.post(`${apiBaseUrl}/Usuarios`, {
    data: academicPayload({ cidade: ' indefinido ', curso: 'A'.repeat(101) }),
  });
  expect(sentinel.status()).toBe(400);
  expect((await sentinel.json()).errors).toEqual(
    expect.objectContaining({ cidade: expect.any(Array), curso: expect.any(Array) })
  );
});

test('perfil apresenta data ausente e cidade legada sem escrita', async ({ page }) => {
  const payload = Buffer.from(
    JSON.stringify({ sub: '4242', role: 'Mentor', password_change_required: false })
  ).toString('base64url');
  const token = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${payload}.`;
  const requestMethods: string[] = [];

  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/Usuarios/4242', async (route) => {
    requestMethods.push(route.request().method());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 4242,
        nomeCompleto: 'Usuario Legado',
        email: 'legacy@example.invalid',
        telefone: null,
        dataIngresso: null,
        status: 'Habilitado',
        nivelUsuario: 'Mentor',
        tipoUsuario: 'Academico',
        instituicao: 'IFPE',
        cidade: 'Indefinido',
        curso: null,
        responsavel: null,
      }),
    });
  });
  await page.route('**/api/Emprestimos/usuario/4242', async (route) => {
    requestMethods.push(route.request().method());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.context().addCookies([
    { name: 'doorKey', value: token, domain: '127.0.0.1', path: '/' },
    { name: 'rankID', value: '4242', domain: '127.0.0.1', path: '/' },
    { name: 'level', value: 'Mentor', domain: '127.0.0.1', path: '/' },
  ]);
  await page.goto('/mentor/profile');

  await expect(page.getByRole('main').getByText('Usuario Legado')).toBeVisible();
  await expect(page.getByText('Indefinido')).toHaveCount(0);
  await expect(page.getByText('Data inválida')).toHaveCount(0);
  expect(await page.getByText('Não informado').count()).toBeGreaterThanOrEqual(3);
  expect(requestMethods.length).toBeGreaterThanOrEqual(2);
  expect(requestMethods.every((method) => method === 'GET')).toBe(true);
});
