import { expect, test, type APIRequestContext } from '@playwright/test';

import { scenarioData, seedE2eScenario } from './infra/e2e-data';

type LoginResponse = { token: string };
type SeededUser = { id: number; email: string; nomeCompleto: string };
type SecondLinkedRole = 'MENTOR' | 'BORROWER';

test.use({ trace: 'off', screenshot: 'off' });
test.setTimeout(120_000);

const login = async (
  request: APIRequestContext,
  account: { email: string; password: string }
): Promise<string> => {
  const response = await request.post(`${scenarioData().apiUrl}/Auth/login`, {
    data: { email: account.email, password: account.password },
  });
  expect(response.status()).toBe(200);
  return ((await response.json()) as LoginResponse).token;
};

const readScenarioUsers = async (
  request: APIRequestContext,
  scenario: string
): Promise<Record<'mentor' | 'borrower' | 'secondMentor' | 'secondBorrower', SeededUser>> => {
  const data = scenarioData(scenario);
  const adminToken = await login(request, data.administrator);
  const response = await request.get(`${data.apiUrl}/Usuarios`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(response.status()).toBe(200);
  const users = (await response.json()) as SeededUser[];
  const find = (email: string): SeededUser => {
    const user = users.find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) throw new Error('O seed E2E não preparou a conta sintética esperada.');
    return user;
  };

  return {
    mentor: find(data.mentor.email),
    borrower: find(data.borrower.email),
    secondMentor: find(secondLinkedAccount(scenario, 'MENTOR').email),
    secondBorrower: find(secondLinkedAccount(scenario, 'BORROWER').email),
  };
};

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const secondLinkedAccount = (
  scenario: string,
  role: SecondLinkedRole
): { email: string; password: string } => {
  const roleName = role === 'MENTOR' ? 'mentor' : 'borrower';
  const prefix = `synthetic-second-${roleName}-${scenario}`;
  return {
    email:
      process.env[`E2E_SEED_SECOND_${role}_EMAIL`] ??
      `${prefix}@example.invalid`,
    password:
      process.env[`E2E_SEED_SECOND_${role}_PASSWORD`] ?? `${prefix}-password`,
  };
};

test('mentor só consulta e acompanha o vínculo autorizado', async ({ request }) => {
  const scenario = 'auth-linked-access';
  await seedE2eScenario(scenario);
  const data = scenarioData(scenario);
  const users = await readScenarioUsers(request, scenario);
  const mentorToken = await login(request, data.mentor);
  const linked = await request.get(`${data.apiUrl}/Usuarios/${users.borrower.id}`, {
    headers: bearer(mentorToken),
  });
  expect(linked.status()).toBe(200);
  expect(await linked.json()).toMatchObject({
    id: users.borrower.id,
    nivelUsuario: 'Mentorado',
  });

  const cross = await request.get(
    `${data.apiUrl}/Usuarios/${users.secondBorrower.id}`,
    { headers: bearer(mentorToken) }
  );
  const missing = await request.get(`${data.apiUrl}/Usuarios/2147483000`, {
    headers: bearer(mentorToken),
  });
  expect(cross.status()).toBe(404);
  expect(await cross.json()).toEqual(await missing.json());

  const before = await request.get(
    `${data.apiUrl}/Usuarios/${users.borrower.id}`,
    { headers: bearer(await login(request, data.administrator)) }
  );
  expect(before.status()).toBe(200);
  const deniedMutation = await request.patch(
    `${data.apiUrl}/Usuarios/${users.borrower.id}`,
    {
      headers: {
        ...bearer(mentorToken),
        'Content-Type': 'application/json-patch+json',
      },
      data: [{ op: 'replace', path: '/nomeCompleto', value: 'Forbidden E2E mutation' }],
    }
  );
  const after = await request.get(
    `${data.apiUrl}/Usuarios/${users.borrower.id}`,
    { headers: bearer(await login(request, data.administrator)) }
  );
  expect(deniedMutation.status()).toBe(404);
  expect(await after.json()).toEqual(await before.json());

  const secondMentorToken = await login(
    request,
    secondLinkedAccount(scenario, 'MENTOR')
  );
  const secondLinked = await request.get(
    `${data.apiUrl}/Usuarios/${users.secondBorrower.id}`,
    { headers: bearer(secondMentorToken) }
  );
  expect(secondLinked.status()).toBe(200);
  const reverseCross = await request.get(
    `${data.apiUrl}/Usuarios/${users.borrower.id}`,
    { headers: bearer(secondMentorToken) }
  );
  expect(reverseCross.status()).toBe(404);
});

test('mentorado atualiza seus próprios dados pela tela de perfil', async ({
  page,
  request,
}) => {
  const scenario = `auth-own-profile-${process.pid}-${Date.now()}`;
  await seedE2eScenario(scenario);
  const data = scenarioData(scenario);
  const users = await readScenarioUsers(request, scenario);

  await page.goto('/');
  await page.locator('input[name="email"]').fill(data.borrower.email);
  await page.locator('input[name="password"]').fill(data.borrower.password);
  await page.getByRole('button', { name: 'Submeter Login' }).click();
  await expect(page).toHaveURL(/\/mentee\/?$/);
  await page.goto('/mentee/profile');
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar meus dados' }).click();

  const newEmail = `updated-${scenario}@example.invalid`;
  await page.getByLabel('Nome completo').fill('E2E Mentee Updated');
  await page.getByLabel('Telefone').fill('81988887777');
  await page.getByLabel('E-mail').fill(newEmail);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  const currentPassword = page.getByLabel('Senha atual');
  await expect(currentPassword).toBeFocused();
  expect(
    await currentPassword.evaluate((input) => (input as HTMLInputElement).validity.valueMissing)
  ).toBe(true);

  await currentPassword.fill('Synthetic incorrect password 2026!');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('alert')).toContainText('senha atual está incorreta');

  await page.getByLabel('Senha atual').fill(data.borrower.password);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toContainText('Perfil atualizado.');
  await expect(page.getByText(newEmail, { exact: true })).toBeVisible();

  const updatedToken = await login(request, {
    email: newEmail,
    password: data.borrower.password,
  });
  const updatedProfile = await request.get(
    `${data.apiUrl}/Usuarios/${users.borrower.id}`,
    { headers: bearer(updatedToken) }
  );
  expect(updatedProfile.status()).toBe(200);
  expect(await updatedProfile.json()).toMatchObject({
    id: users.borrower.id,
    email: newEmail,
    nomeCompleto: 'E2E Mentee Updated',
    telefone: '81988887777',
  });
});
