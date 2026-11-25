import { http, HttpResponse } from 'msw';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';
import { establishTestSession } from '@/test/session';
import { readSession } from '@/auth/session';

import ProductHistoryPage from './ProductHistory';

const API_ORIGIN = 'http://localhost:8080/api';
const historyUrl = `${API_ORIGIN}/Produtos/7/historico-saida`;

const productHistory = {
  produtoId: 7,
  nomeProduto: 'Béquer',
  tipoProduto: 'Vidraria',
  estoqueAtual: 4,
  unidadeMedida: 'unidade',
  historico: [],
  totalEmprestimos: 0,
  totalQuantidadeEmprestada: 0,
};

const legacyProductHistory = {
  ...productHistory,
  historico: [
    {
      emprestimoId: 12,
      dataSaida: '2026-09-01T10:00:00',
      unidadeMedida: 'mL',
      solicitanteNome: 'Solicitante',
      dataEmprestimo: '2026-09-01T10:00:00',
      dataDevolucao: null,
      quantidadeEmprestada: 2,
      statusEmprestimo: 'Aprovado',
      solicitante: {
        id: 1,
        nome: 'Solicitante',
        email: 'contato-sintetico@example.invalid',
        instituicao: null,
      },
      aprovador: null,
      identificador: 'contato-sintetico',
      lote: 'LOTE-01',
    },
  ],
  totalEmprestimos: 1,
  totalQuantidadeEmprestada: 2,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/products/7/history']}>
      <Routes>
        <Route
          path='/admin/products/:id/history'
          element={<ProductHistoryPage />}
        />
        <Route
          path='/admin/search-material'
          element={<div>Busca administrativa</div>}
        />
      </Routes>
    </MemoryRouter>
  );

describe('ProductHistory: estados de consulta', () => {
  beforeEach(() => {
    establishTestSession('12', 'Administrador');
  });

  afterEach(() => {
  });

  it('distingue histórico vazio de falha de consulta', async () => {
    server.use(http.get(historyUrl, () => HttpResponse.json(productHistory)));

    renderPage();

    expect(await screen.findByText('Nenhum registro encontrado')).toBeInTheDocument();
    expect(screen.getByText('Béquer')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Produto não encontrado')).not.toBeInTheDocument();
  });

  it('exibe as colunas operacionais e omite os dados pessoais legados', async () => {
    server.use(http.get(historyUrl, () => HttpResponse.json(legacyProductHistory)));

    renderPage();

    await screen.findByRole('cell', { name: 'Solicitante' });
    const page = screen.getByRole('main');
    expect(page).not.toHaveTextContent('contato-sintetico@example.invalid');
    expect(page).not.toHaveTextContent('contato-sintetico');
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent)
    ).toEqual(['Data', 'Empréstimo', 'Solicitante', 'Lote', 'Quantidade', 'Unidade']);
    const row = screen.getByRole('cell', { name: 'LOTE-01' }).closest('tr');
    if (!row) throw new Error('Linha do lote sintético não encontrada.');
    expect(
      within(row).getByRole('cell', { name: '01/09/2026' })
    ).toBeInTheDocument();
    expect(
      within(row).getByRole('cell', { name: 'LOTE-01' })
    ).toBeInTheDocument();
  });

  it('não presume nome nem lote corrente e usa somente os totais do recorte', async () => {
    server.use(http.get(historyUrl, () => HttpResponse.json({
      ...productHistory,
      historico: [{ emprestimoId: 12, dataSaida: '2026-09-01T10:00:00', quantidadeEmprestada: 2,
        unidadeMedida: 'mL', lote: null, solicitanteNome: null }],
      totalEmprestimos: 1, totalQuantidadeEmprestada: 2,
    })));
    renderPage();
    expect(await screen.findByRole('cell', { name: '01/09/2026' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'mL' })).toBeInTheDocument();
    expect(screen.getByText('Total de empréstimos: 1')).toBeInTheDocument();
    expect(screen.queryByText('Estoque Atual')).not.toBeInTheDocument();
    expect(screen.queryByText('Data inválida')).not.toBeInTheDocument();
    expect(screen.queryByText('Armário de EPIs')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar no historico' }), { target: { value: '12' } });
    expect(screen.getByRole('cell', { name: '01/09/2026' })).toBeInTheDocument();
  });

  it.each(['contato-sintetico@example.invalid', 'contato-sintetico'])(
    'omite o registro ao buscar pelo valor legado %s',
    async (query) => {
      server.use(http.get(historyUrl, () => HttpResponse.json(legacyProductHistory)));
      renderPage();
      await screen.findByRole('cell', { name: 'Solicitante' });

      fireEvent.change(
        screen.getByRole('textbox', { name: 'Buscar no historico' }),
        { target: { value: query } }
      );

      expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
      expect(screen.queryByRole('cell', { name: 'Solicitante' })).not.toBeInTheDocument();
    }
  );

  it.each(['solicitante', 'lote-01'])(
    'encontra a movimentação ao buscar pelo campo operacional %s',
    async (query) => {
      server.use(http.get(historyUrl, () => HttpResponse.json(legacyProductHistory)));
      renderPage();
      await screen.findByRole('cell', { name: 'Solicitante' });
      const search = screen.getByRole('textbox', { name: 'Buscar no historico' });

      fireEvent.change(search, { target: { value: 'sem-correspondencia' } });
      expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();

      fireEvent.change(search, { target: { value: query } });
      expect(
        screen.getByRole('cell', {
          name: query === 'lote-01' ? 'LOTE-01' : 'Solicitante',
        })
      ).toBeInTheDocument();
    }
  );

  it.each([
    [400, 'validation'],
    [404, 'not_found'],
    [409, 'conflict'],
    [500, 'server'],
  ] as const)('apresenta a categoria HTTP %s sem usar vazio como fallback', async (status, category) => {
    server.use(
      http.get(historyUrl, () =>
        HttpResponse.json(
          { detail: 'SENTINELA_REMOTA', traceId: `product-ref-${status}` },
          { status }
        )
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar o histórico do produto');
    expect(feedback).toHaveTextContent(ERROR_CATALOG[category].message);
    expect(feedback).toHaveTextContent(ERROR_CATALOG[category].suggestedAction);
    expect(feedback).toHaveTextContent(`Código de referência: product-ref-${status}`);
    expect(feedback).not.toHaveTextContent('SENTINELA_REMOTA');
    expect(feedback).not.toHaveTextContent('Nenhum registro encontrado');
  });

  it('mantém a sessão e oferece retorno para autorização', async () => {
    server.use(
      http.get(historyUrl, () =>
        HttpResponse.json(
          { detail: 'SENTINELA_REMOTA', traceId: 'product-ref-403' },
          { status: 403 }
        )
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.authorization.message);
    expect(feedback).toHaveTextContent('Voltar');
    expect(feedback).not.toHaveTextContent('SENTINELA_REMOTA');
    expect(readSession()?.userId).toBe('12');
  });

  it('retorna à busca administrativa após carregar o histórico', async () => {
    server.use(http.get(historyUrl, () => HttpResponse.json(productHistory)));

    renderPage();

    await screen.findByText('Béquer');
    screen.getByRole('button', { name: 'Voltar para busca de materiais' }).click();

    expect(await screen.findByText('Busca administrativa')).toBeInTheDocument();
  });

  it('repete a consulta e recupera o histórico', async () => {
    let attempts = 0;
    server.use(
      http.get(historyUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ traceId: 'product-ref-500' }, { status: 500 })
          : HttpResponse.json(legacyProductHistory);
      })
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_CATALOG.server.message);
    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    expect(await screen.findByRole('cell', { name: 'Solicitante' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('mantém o feedback em uma nova falha de repetição', async () => {
    let attempts = 0;
    server.use(
      http.get(historyUrl, () => {
        attempts += 1;
        return HttpResponse.json(
          { traceId: `product-ref-${attempts}` },
          { status: 500 }
        );
      })
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Código de referência: product-ref-1');
    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    await waitFor(() => {
      const feedback = screen.getByRole('alert');
      expect(feedback).toHaveTextContent(ERROR_CATALOG.server.message);
      expect(feedback).toHaveTextContent('Código de referência: product-ref-2');
      expect(feedback).not.toHaveTextContent('Nenhum registro encontrado');
    });
    expect(attempts).toBe(2);
  });

  it('classifica falha de rede sem expor detalhes técnicos', async () => {
    server.use(http.get(historyUrl, () => HttpResponse.error()));

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent(ERROR_CATALOG.network.message);
    expect(feedback).toHaveTextContent(ERROR_CATALOG.network.suggestedAction);
    expect(feedback).not.toHaveTextContent('TypeError');
    expect(feedback).not.toHaveTextContent('Failed to fetch');
  });
});
