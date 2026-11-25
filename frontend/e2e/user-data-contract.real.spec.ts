import { expect, test } from '@playwright/test';

import { e2eScenario, seedE2eScenario } from './infra/e2e-data';

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
  responsavelEmail: e2eScenario.mentor.email,
  ...overrides,
});

test.setTimeout(90_000);

test.beforeEach(async () => {
  await seedE2eScenario();
});

test('cadastra Mentor acadêmico sem responsável e normaliza cidade e curso', async ({
  page,
}) => {
  await page.goto('/create-account');

  await page.getByText('Tipo', { exact: true }).click();
  await page.getByRole('option', { name: 'Mentor', exact: true }).click();
  await page.getByLabel('Nome Completo').fill('Pessoa Sintetica E2E');
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail('browser'));
  await page
    .locator('input[name="senha"]')
    .fill('Synthetic User Data Password 2026!');
  await page
    .locator('input[name="repeat"]')
    .fill('Synthetic User Data Password 2026!');
  await page.getByLabel('Instituição').fill('IFPE');
  await page.getByLabel('Curso').fill('  ES  ');
  await page.getByLabel('Cidade').fill('  Belo Jardim  ');
  await page.getByLabel('Telefone').fill('81999999999');
  await expect(
    page.getByRole('textbox', { name: /email do .*responsável/i })
  ).toHaveCount(0);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${e2eScenario.apiUrl}/Usuarios` &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Criar Conta' }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(201);
  const requestBody = response.request().postDataJSON();
  expect(requestBody).toMatchObject({
    cidade: 'Belo Jardim',
    curso: 'ES',
    nivelUsuario: 'Mentor',
    responsavelEmail: '',
    tipoUsuario: 'Academico',
  });
  expect(requestBody.cidade).not.toBe('Indefinido');
  const body = await response.json();
  expect(body.dataIngresso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('API rejeita cidade e curso invalidos com Problem Details por campo', async ({
  request,
}) => {
  const invalid = await request.post(`${e2eScenario.apiUrl}/Usuarios`, {
    data: academicPayload({ cidade: '   ', curso: 'E' }),
  });

  expect(invalid.status()).toBe(400);
  expect(invalid.headers()['content-type']).toContain(
    'application/problem+json'
  );
  const invalidBody = await invalid.json();
  expect(invalidBody.errors).toMatchObject({
    cidade: ['Informe uma cidade válida.'],
    curso: ['O curso deve ter entre 2 e 100 caracteres.'],
  });

  const sentinelCity = await request.post(`${e2eScenario.apiUrl}/Usuarios`, {
    data: academicPayload({ cidade: ' indefinido ', curso: 'ES' }),
  });
  expect(sentinelCity.status()).toBe(400);
  expect((await sentinelCity.json()).errors).toMatchObject({
    cidade: ['Informe uma cidade válida.'],
  });

  const overlengthCourse = await request.post(
    `${e2eScenario.apiUrl}/Usuarios`,
    {
      data: academicPayload({ cidade: 'Belo Jardim', curso: 'A'.repeat(101) }),
    }
  );
  expect(overlengthCourse.status()).toBe(400);
  expect((await overlengthCourse.json()).errors).toEqual(
    expect.objectContaining({ curso: expect.any(Array) })
  );
});
