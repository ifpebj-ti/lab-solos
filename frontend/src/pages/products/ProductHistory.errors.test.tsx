import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CATALOG } from '@/errors/errorCatalog';
import { server } from '@/test/msw/server';

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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/products/7/history']}>
      <Routes>
        <Route path='/products/:id/history' element={<ProductHistoryPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProductHistory: estados de consulta', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
  });

  afterEach(() => {
    Cookie.remove('doorKey');
  });

  it('distingue histórico vazio de falha de consulta', async () => {
    server.use(http.get(historyUrl, () => HttpResponse.json(productHistory)));

    renderPage();

    expect(await screen.findByText('Nenhum registro encontrado')).toBeInTheDocument();
    expect(screen.getByText('Béquer')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Produto não encontrado')).not.toBeInTheDocument();
  });

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
    expect(Cookie.get('doorKey')).toBe('session-token');
  });

  it('repete a consulta e recupera o histórico', async () => {
    let attempts = 0;
    server.use(
      http.get(historyUrl, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ traceId: 'product-ref-500' }, { status: 500 })
          : HttpResponse.json({
              ...productHistory,
              historico: [
                {
                  emprestimoId: 12,
                  dataEmprestimo: '2026-09-01T10:00:00',
                  dataDevolucao: null,
                  quantidadeEmprestada: 2,
                  statusEmprestimo: 'Aprovado',
                  solicitante: {
                    id: 1,
                    nome: 'Solicitante',
                    email: 'a@test.invalid',
                    instituicao: null,
                  },
                  aprovador: null,
                  identificador: 'B-01',
                  lote: null,
                },
              ],
            });
      })
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_CATALOG.server.message);
    screen.getByRole('button', { name: 'Tentar novamente' }).click();

    expect(await screen.findByText('Solicitante')).toBeInTheDocument();
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
