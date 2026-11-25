import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import { mockResponsiveSession } from './responsive-support';

test.describe.configure({ mode: 'serial' });

test('notificações e auditoria exibem destinatário, revisão, filtros e exportação minimizada', async ({
  page,
}) => {
  const notificationTitle = 'Aviso UI de destinatário sintético';
  let notificationUnread = true;
  let logSuspected = false;
  const logRequests: URL[] = [];
  const exportRequests: URL[] = [];
  const revisions: Array<Record<string, unknown>> = [];
  let submittedRevision: unknown;

  const auditLog = () => ({
    id: 812,
    codigoEvento: 'EmissaoNotificacao',
    acao: 'emissao_notificacao',
    recurso: 'notificacao:812',
    dataHoraUtc: '2026-11-23T10:15:00Z',
    origem: 'UsuarioAutenticado',
    resultado: 'Sucesso',
    suspeita: logSuspected,
    categoriaDeteccao: 'AtividadeNormal',
    codigoRegraDeteccao: null,
    versaoRegraDeteccao: null,
    quantidadeObservadaDeteccao: null,
    revisaoClassificacao: revisions.length,
    historicoClassificacao: revisions,
  });

  const report = () => ({
    totalLogs: logSuspected ? 1 : 0,
    logsSuspeitos: logSuspected ? 1 : 0,
    logsCriticos: 0,
    logsPorTipo: {},
    logsPorDia: {},
    ultimosLogsSuspeitos: logSuspected ? [auditLog()] : [],
  });

  await mockResponsiveSession(page, 'Administrador');
  await page.route('**/api/Notificacoes/minhas**', (route) =>
    route.fulfill({
      json: [
        {
          id: 812,
          titulo: notificationTitle,
          mensagem: 'Conteúdo de notificação sem dados de outros destinatários.',
          tipo: 'Sistema',
          tipoTexto: 'Sistema',
          lida: !notificationUnread,
          dataCriacao: '2026-11-23T10:00:00Z',
        },
      ],
    })
  );
  await page.route('**/api/Notificacoes/count-nao-lidas', (route) =>
    route.fulfill({ json: { count: notificationUnread ? 1 : 0 } })
  );
  await page.route('**/api/Notificacoes/812/marcar-lida', async (route) => {
    notificationUnread = false;
    await route.fulfill({ json: { message: 'Notificação marcada como lida' } });
  });
  await page.route('**/api/Auditoria/logs**', async (route) => {
    const url = new URL(route.request().url());
    logRequests.push(url);
    const pagina = Number(url.searchParams.get('pagina') ?? 1);
    await route.fulfill({
      json: {
        itens: [auditLog()],
        pagina,
        tamanhoPagina: 25,
        totalItens: 26,
        totalPaginas: 2,
      },
    });
  });
  await page.route('**/api/Auditoria/relatorio**', (route) =>
    route.fulfill({ json: report() })
  );
  await page.route('**/api/Auditoria/exportar**', (route) => {
    exportRequests.push(new URL(route.request().url()));
    return route.fulfill({
      status: 200,
      contentType: 'text/csv; charset=utf-8',
      body: 'codigoEvento,acao,recurso\nEmissaoNotificacao,emissao_notificacao,notificacao:812',
    });
  });
  await page.route('**/api/Auditoria/marcar-suspeito/812', async (route) => {
    submittedRevision = route.request().postDataJSON();
    logSuspected = true;
    revisions.push({
      numeroRevisao: 1,
      suspeitaAnterior: false,
      suspeitaResultante: true,
      justificativa: 'Revisão sintética pela interface.',
      criadaEmUtc: '2026-11-23T10:20:00Z',
      autorUsuarioId: 4242,
      origem: 'RevisaoManual',
    });
    await route.fulfill({
      json: { message: 'Classificação atualizada', revisaoClassificacao: 1 },
    });
  });

  await page.goto('/admin/auditoria');
  await expect(
    page.getByRole('heading', { name: 'Auditoria de Segurança' })
  ).toBeVisible();

  const notificationButton = page
    .getByRole('button', { name: /Notificações/ })
    .first();
  await expect(notificationButton).toBeVisible();
  await notificationButton.click();
  await expect(page.getByText(notificationTitle, { exact: true })).toBeVisible();
  await page.getByText(notificationTitle, { exact: true }).click();
  await expect.poll(() => notificationUnread).toBe(false);

  await page.getByLabel('Recurso').fill('notificacao:812');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByText('EmissaoNotificacao', { exact: true })).toBeVisible();
  await expect
    .poll(() => logRequests.at(-1)?.searchParams.get('recurso'))
    .toBe('notificacao:812');

  await page.getByRole('button', { name: 'Próxima' }).click();
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await expect
    .poll(() => logRequests.at(-1)?.searchParams.get('pagina'))
    .toBe('2');
  expect(logRequests.at(-1)?.searchParams.get('recurso')).toBe('notificacao:812');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('auditoria.csv');
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('notificacao:812');
  expect(csv).not.toContain('CONTEXTO_BRUTO_NAO_EXPORTAR');
  expect(csv).not.toContain('segredo-sintetico');
  expect(exportRequests.at(-1)?.searchParams.get('recurso')).toBe('notificacao:812');
  expect(exportRequests.at(-1)?.searchParams.has('pagina')).toBe(false);

  await page.getByRole('button', { name: 'Marcar suspeito' }).click();
  await page
    .getByLabel('Justificativa da revisão')
    .fill('Revisão sintética pela interface.');
  await page.getByRole('button', { name: 'Salvar revisão' }).click();
  await expect(page.getByText('Suspeito', { exact: true })).toBeVisible();
  expect(submittedRevision).toEqual({
    revisaoEsperada: 0,
    justificativa: 'Revisão sintética pela interface.',
  });

  await page.getByText('Histórico e regra').click();
  await expect(page.getByText('Revisão 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Autor: ID 4242', { exact: true })).toBeVisible();
  await expect(page.getByText('Justificativa registrada', { exact: true })).toBeVisible();
  await expect(page.getByText('segredo-sintetico', { exact: true })).toHaveCount(0);
  await expect(page.getByText('CONTEXTO_BRUTO_NAO_EXPORTAR', { exact: true })).toHaveCount(0);
});
