import { expect, test } from '@playwright/test';

test('perfil apresenta data ausente e cidade legada sem escrita', async ({ page }) => {
  const requestMethods: string[] = [];

  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/Auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 4242,
        role: 'Mentor',
        requiresPasswordChange: false,
        csrfToken: 'user-data-test-csrf-proof',
      }),
    });
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

  await page.addInitScript(() => {
    sessionStorage.setItem(
      'auth:session-context',
      JSON.stringify({
        userId: '4242',
        role: 'Mentor',
        requiresPasswordChange: false,
      })
    );
    sessionStorage.setItem('auth:csrf-token', 'user-data-test-csrf-proof');
  });
  await page.goto('/mentor/profile');

  await expect(page.getByRole('main').getByText('Usuario Legado')).toBeVisible();
  await expect(page.getByText('Indefinido')).toHaveCount(0);
  await expect(page.getByText('Data inválida')).toHaveCount(0);
  expect(await page.getByText('Não informado').count()).toBeGreaterThanOrEqual(3);
  expect(requestMethods.length).toBeGreaterThanOrEqual(2);
  expect(requestMethods.every((method) => method === 'GET')).toBe(true);
});
