import { expect, type Page } from '@playwright/test';

export const responsiveViewports = [
  { width: 320, height: 800 },
  { width: 375, height: 812 },
  { width: 767, height: 900 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
export const productFixtures = Array.from({ length: 42 }, (_, index) => ({
  id: index + 101,
  nomeProduto:
    index === 0
      ? 'A'.repeat(200)
      : index === 1
        ? 'Nome longo com espaços para verificar a leitura completa do produto no cartão responsivo'
        : `Produto ${index + 1}`,
  tipoProduto: index === 0 ? 'Vidraria' : 'Quimico',
  quantidade: 3,
  unidadeMedida: index === 1 ? undefined : 'ml',
  status: 'Disponivel',
}));
export const registrationRequestFixtures = Array.from(
  { length: 8 },
  (_, index) => ({
    id: index + 501,
    nomeCompleto:
      index === 0
        ? 'Pessoa ' + 'A'.repeat(200)
        : `Pessoa sintetica ${index + 1}`,
    email: `pessoa-${index + 1}@example.invalid`,
    telefone: null,
    dataIngresso: `2026-09-${String(index + 1).padStart(2, '0')}`,
    status: 'Pendente',
    nivelUsuario: 'Mentorado',
    cidade: 'Belo Jardim',
    curso: 'ES',
    instituicao: index === 1 ? null : 'IFPE Campus Belo Jardim',
  })
);
export const loanRequestFixtures = Array.from({ length: 8 }, (_, index) => ({
  id: index + 701,
  dataRealizacao: `2026-09-${String(index + 1).padStart(2, '0')}T10:00:00`,
  dataDevolucao: `2026-09-${String(index + 8).padStart(2, '0')}T10:00:00`,
  dataAprovacao: null,
  status: 'Pendente',
  emprestimoProdutos: [],
  solicitanteId: index + 501,
  solicitante: {
    id: index + 501,
    nomeCompleto:
      index === 0
        ? 'Pessoa ' + 'A'.repeat(200)
        : `Pessoa sintetica ${index + 1}`,
    email: index === 1 ? null : `emprestimo-${index + 1}@example.invalid`,
  },
  aprovadorId: null,
  aprovador: null,
}));
export const registeredUserFixtures = Array.from({ length: 8 }, (_, index) => ({
  id: index + 801,
  nomeCompleto:
    index === 0
      ? 'Pessoa ' + 'A'.repeat(200)
      : `Pessoa cadastrada ${index + 1}`,
  email: `cadastrada-${index + 1}@example.invalid`,
  telefone: null,
  dataIngresso: `2026-09-${String(index + 1).padStart(2, '0')}`,
  status: index === 0 ? 'Desabilitado' : 'Habilitado',
  nivelUsuario:
    index % 3 === 0
      ? 'Administrador'
      : index % 3 === 1
        ? 'Mentor'
        : 'Mentorado',
  tipoUsuario: index % 3 === 0 ? 'Comum' : 'Academico',
  cidade: index % 3 === 0 ? undefined : 'Belo Jardim',
  curso: index % 3 === 0 ? undefined : 'ES',
  instituicao: index % 3 === 0 ? undefined : 'IFPE Campus Belo Jardim',
  responsavel: null,
}));
export const loanCreationDependents = [
  {
    id: 901,
    nomeCompleto: 'Pessoa dependente sintética',
    email: 'dependente@example.invalid',
    telefone: null,
    dataIngresso: '2026-09-01',
    status: 'Habilitado',
    nivelUsuario: 'Mentorado',
    tipoUsuario: 'Academico',
    cidade: 'Belo Jardim',
    curso: 'ES',
    instituicao: 'IFPE Campus Belo Jardim',
    responsavel: null,
  },
];
export const returnLoanFixtures = {
  id: 999,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    id: 4242,
    nomeCompleto: 'Pessoa Sintética',
    email: 'sessao@example.invalid',
    telefone: null,
    responsavel: null,
  },
  aprovador: null,
  produtos: [
    {
      emprestimoId: 999,
      quantidade: 2,
      produto: {
        id: 1001,
        nomeProduto: 'Vidraria ' + 'A'.repeat(200),
        tipoProduto: 'Vidraria',
        quantidade: 2,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-1001' },
      },
    },
    {
      emprestimoId: 999,
      quantidade: 1,
      produto: {
        id: 1002,
        nomeProduto: 'Proveta sintética',
        tipoProduto: 'Vidraria',
        quantidade: 1,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-1002' },
      },
    },
    {
      emprestimoId: 999,
      quantidade: 3,
      produto: {
        id: 1003,
        nomeProduto: 'Ácido cítrico',
        tipoProduto: 'Quimico',
        quantidade: 3,
        unidadeMedida: undefined,
        lote: { codigoLote: 'L-1003' },
      },
    },
    {
      emprestimoId: 999,
      quantidade: 4,
      produto: {
        id: 1004,
        nomeProduto: 'Balança',
        tipoProduto: 'Outro',
        quantidade: 4,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-1004' },
      },
    },
  ],
};
export const loanHistoryAdminFixture = {
  id: 1100,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    id: 4242,
    nomeCompleto: 'Pessoa Sintética',
    email: 'sessao@example.invalid',
    telefone: null,
    nivelUsuario: 'Mentorado',
  },
  aprovador: null,
  produtos: [
    {
      emprestimoId: 1100,
      quantidade: 2,
      produto: {
        id: 1101,
        nomeProduto: 'Produto histórico ' + 'A'.repeat(200),
        tipoProduto: 'Vidraria',
        quantidade: 2,
        unidadeMedida: 'Unidade',
        lote: { codigoLote: 'L-1101' },
      },
    },
    {
      emprestimoId: 1100,
      quantidade: 1,
      produto: {
        id: 1102,
        nomeProduto: 'Produto sem lote',
        tipoProduto: 'Quimico',
        quantidade: 1,
        unidadeMedida: undefined,
        lote: null,
      },
    },
  ],
};
export const loanHistoryMenteeFixture = {
  id: 1200,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'Aprovado',
  solicitante: {
    id: 4242,
    nomeCompleto: 'Pessoa Sintética',
    email: 'sessao@example.invalid',
    telefone: null,
  },
  aprovador: null,
  emprestimoProdutos: [
    {
      id: 1,
      emprestimoId: 1200,
      produtoId: 1201,
      quantidade: 4,
      produto: {
        id: 1201,
        nomeProduto: 'Reagente histórico ' + 'B'.repeat(200),
        tipo: 'Químico',
        quantidade: 4,
        loteId: null,
      },
    },
  ],
};
export const verificationProductFixture = {
  id: 101,
  catmat: 'CAT-101',
  unidadeMedida: 'kg',
  estadoFisico: 1,
  cor: 1,
  odor: 1,
  densidade: 1,
  pesoMolecular: 1,
  grauPureza: 'Alta',
  formulaQuimica: 'H2O',
  grupo: 7,
  nomeProduto: 'Produto de verificação ' + 'A'.repeat(200),
  fornecedor: 'Fornecedor sintético',
  tipoProduto: 'Quimico',
  quantidade: 3,
  quantidadeMinima: 1,
  dataFabricacao: null,
  dataValidade: '2027-01-01',
  localizacaoProduto: 'Armário 1',
  status: 1,
  ultimaModificacao: '2026-09-01',
  loteId: 9,
  lote: 'L-9',
  emprestimo: null,
  capacidade: 1,
  altura: '1',
  formato: 'Cilíndrico',
  graduada: 'Sim',
  material: 'Vidro',
};
export const verificationHistoryFixture = {
  produtoId: 101,
  nomeProduto: verificationProductFixture.nomeProduto,
  tipoProduto: 'Quimico',
  estoqueAtual: 3,
  unidadeMedida: 'kg',
  totalEmprestimos: 2,
  totalQuantidadeEmprestada: 5,
  historico: [
    {
      emprestimoId: 2001,
      dataEmprestimo: '2026-09-01T10:00:00',
      dataDevolucao: null,
      quantidadeEmprestada: 2,
      statusEmprestimo: 'Emprestado',
      solicitante: {
        id: 4242,
        nome: 'Pessoa sintética',
        email: 'sessao@example.invalid',
        instituicao: null,
      },
      aprovador: null,
      identificador: 'ID-2001',
      lote: null,
    },
    {
      emprestimoId: 2002,
      dataEmprestimo: '2026-09-02T10:00:00',
      dataDevolucao: null,
      quantidadeEmprestada: 3,
      statusEmprestimo: 'Devolvido',
      solicitante: {
        id: 4243,
        nome: 'Outra pessoa',
        email: 'outra@example.invalid',
        instituicao: null,
      },
      aprovador: null,
      identificador: 'ID-2002',
      lote: 'L-2002',
    },
  ],
};
export const loanHistoriesFixtures = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1301,
  dataRealizacao: `2026-09-${String(index + 1).padStart(2, '0')}T10:00:00`,
  dataDevolucao: '',
  dataAprovacao: '',
  status: index % 2 === 0 ? 'devolvido' : 'não devolvido',
  produtos: Array.from({ length: (index % 3) + 1 }, (_, productIndex) => ({
    id: productIndex + 1,
  })),
  solicitanteId: index + 1,
  solicitante: {
    id: index + 1,
    nomeCompleto: index === 0 ? 'Pessoa ' + 'B'.repeat(200) : `Pessoa ${index + 1}`,
  },
  aprovadorId: 4242,
  aprovador: null,
}));

export const alertFixtures = [
  {
    id: 1901,
    nomeProduto: 'Alerta ' + 'A'.repeat(200),
    tipoProduto: 'Quimico',
    fornecedor: 'Fornecedor sintético',
    quantidade: 2,
    quantidadeMinima: 8,
    localizacaoProduto: 'Armário 1',
    dataFabricacao: null,
    dataValidade: '2026-12-20',
    status: 'Disponível',
    unidadeMedida: 'Litro',
  },
];

export const classFixture = {
  ...registeredUserFixtures[0],
  id: 2401,
  nomeCompleto: 'Responsável da turma',
  email: 'responsavel@example.invalid',
  status: 'Habilitado',
  nivelUsuario: 'Mentor',
  tipoUsuario: 'Academico',
  cidade: 'Belo Jardim',
  curso: 'Engenharia de Software',
  instituicao: 'IFPE',
};

export const classDependentsFixtures = [
  {
    ...loanCreationDependents[0],
    id: 2402,
    nomeCompleto: 'Mentorado ' + 'B'.repeat(200),
    email: 'mentorado@example.invalid',
    instituicao: 'Universidade sintética',
    curso: 'Engenharia de Software',
  },
];

export const adminLoansFixtures = [
  {
    id: 3301,
    dataRealizacao: '2026-09-03T10:00:00',
    dataDevolucao: null,
    dataAprovacao: null,
    status: 'Pendente',
    produtos: [{ id: 1 }],
    solicitante: { id: 1, nomeCompleto: 'Solicitante ' + 'D'.repeat(120), email: 'solicitante@example.invalid' },
    aprovador: { id: 2, nomeCompleto: 'Responsável', email: 'responsavel@example.invalid' },
  },
];

export const classLoansFixtures = [
  {
    id: 3401,
    dataRealizacao: '2026-09-04T10:00:00',
    dataDevolucao: null,
    dataAprovacao: null,
    status: 'devolvido',
    emprestimoProdutos: [{ id: 1 }],
    solicitanteId: 2402,
    solicitante: { ...classDependentsFixtures[0], nomeCompleto: 'Mentorado ' + 'B'.repeat(80) },
    aprovadorId: 4242,
    aprovador: null,
  },
];

export const mentoringLoansFixtures = [
  {
    id: 3501,
    dataRealizacao: '2026-09-05T10:00:00',
    dataDevolucao: null,
    dataAprovacao: null,
    status: 'Pendente',
    produtos: [{ id: 1 }],
    solicitante: classFixture,
    aprovador: null,
  },
];

export const mentorDependentsFixtures = [
  {
    ...loanCreationDependents[0],
    id: 4101,
    nomeCompleto: 'Mentorado ' + 'M'.repeat(120),
    email: 'mentorando@example.invalid',
  },
];

export const mentorHistoryFixtures = [
  {
    id: 4301,
    dataRealizacao: '2026-09-06T10:00:00',
    dataDevolucao: null,
    dataAprovacao: null,
    status: 'devolvido',
    produtos: [{ id: 1 }],
    solicitante: mentorDependentsFixtures[0],
    aprovador: null,
  },
];

export const mentorMentoringHistoryFixtures = [
  {
    id: 4501,
    dataRealizacao: '2026-09-06T10:00:00',
    dataDevolucao: null,
    dataAprovacao: null,
    status: 'devolvido',
    produtos: [{ id: 1 }],
    solicitante: mentorDependentsFixtures[0],
    aprovador: null,
  },
];

export const menteeMentoringHistoryFixtures = [
  {
    id: 4601,
    dataRealizacao: '2026-09-07T10:00:00',
    dataDevolucao: null,
    dataAprovacao: null,
    status: 'Pendente',
    produtos: [{ id: 1 }],
    solicitanteId: 4242,
    solicitante: null,
    aprovadorId: 4242,
    aprovador: null,
  },
];
export async function mockResponsiveSession(page: Page, role: string) {
  const payload = Buffer.from(
    JSON.stringify({ sub: '4242', role, password_change_required: false })
  ).toString('base64url');
  const hostname = new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173')
    .hostname;
  await page.context().addCookies([
    {
      name: 'doorKey',
      value: `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${payload}.`,
      domain: hostname,
      path: '/',
    },
    { name: 'rankID', value: '4242', domain: hostname, path: '/' },
    { name: 'level', value: role, domain: hostname, path: '/' },
  ]);
  await page.route('**/api/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/Usuarios/4242', (route) =>
    route.fulfill({
      json: {
        id: 4242,
        nomeCompleto: 'Pessoa Sintética',
        email: 'sessao@example.invalid',
        telefone: null,
        dataIngresso: '2026-09-01',
        status: 'Habilitado',
        nivelUsuario: role,
        tipoUsuario: role === 'Administrador' ? 'Administrador' : 'Academico',
        cidade: role === 'Administrador' ? undefined : 'Belo Jardim',
        curso: role === 'Administrador' ? undefined : 'ES',
        instituicao: role === 'Administrador' ? undefined : 'IFPE',
        responsavel: null,
      },
    })
  );
  await page.route('**/api/System/quantities', (route) =>
    route.fulfill({
      json: { produtos: { Vidraria: 1, Quimico: 41, Outro: 0 } },
    })
  );
}
export async function expectPageFits(page: Page, listName: string | RegExp = 'Produtos') {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
  const list = page.getByRole('list', { name: listName, exact: true });
  if (await list.count()) {
    const bounds = await list.boundingBox();
    expect(bounds).not.toBeNull();
    for (const record of await list.getByRole('listitem').all()) {
      expect(
        await record.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1
        )
      ).toBe(true);
      for (const cell of await record.locator('dd').all()) {
        expect(
          await cell.evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1
          )
        ).toBe(true);
        expect(
          await cell.evaluate(
            (element) => element.scrollHeight <= element.clientHeight + 1
          )
        ).toBe(true);
        const box = await cell.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(bounds!.x - 1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(
          bounds!.x + bounds!.width + 1
        );
      }
    }
  }
  for (const control of await page
    .locator(
      'main button, main input, main a, [role="listbox"], [role="dialog"] button'
    )
    .all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(sizes.viewport + 1);
  }
}

export async function fillResponsiveAccount(page: Page) {
  await page.getByRole('combobox').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('option', { name: 'Mentor', exact: true })
  ).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox')).toBeFocused();
  for (const [name, value] of Object.entries({
    nome: 'Pessoa Sintética ' + 'A'.repeat(200),
    email: 'responsive@example.invalid',
    senha: 'Sintetica123!',
    repeat: 'Sintetica123!',
    instituicao: 'Instituição de Ensino Sintética',
    curso: '  ES  ',
    cidade: '  Belo Jardim  ',
    telefone: '81999999999',
    emailMentor: 'mentor@example.invalid',
  }))
    await page.locator(`input[name="${name}"]`).fill(value);
}

export async function expectAccountFits(page: Page) {
  await expectPageFits(page);
  const form = page.locator('form');
  const bounds = (await form.boundingBox())!;
  for (const element of await form
    .locator('input, button, label, p:visible')
    .all()) {
    if (!(await element.isVisible())) continue;
    const box = (await element.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    if (await element.evaluate((e) => e.tagName === 'P')) {
      expect(
        await element.evaluate(
          (e) =>
            e.scrollWidth <= e.clientWidth + 1 &&
            e.scrollHeight <= e.clientHeight + 1
        )
      ).toBe(true);
    }
  }
  const fields = page.locator('form input:not([type="hidden"])');
  const first = (await fields.nth(0).boundingBox())!;
  const second = (await fields.nth(1).boundingBox())!;
  if (page.viewportSize()!.width < 768) {
    expect(second.x).toBe(first.x);
    expect(second.y).toBeGreaterThan(first.y + first.height);
  } else {
    expect(second.y).toBe(first.y);
    expect(second.x).toBeGreaterThan(first.x + first.width);
  }
}
