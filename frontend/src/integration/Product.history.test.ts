import { establishTestSession } from '@/test/session';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import { getProductHistoricoSaida } from './Product';

const url = 'http://localhost:8080/api/Produtos/7/historico-saida';
const projection = {
  produtoId: 7, nomeProduto: 'Produto sintético', tipoProduto: 'Quimico', unidadeMedida: 'kg',
  totalEmprestimos: 1, totalQuantidadeEmprestada: 2,
  historico: [{ emprestimoId: 12, dataSaida: '2026-09-01T10:00:00Z',
    quantidadeEmprestada: 2, unidadeMedida: 'g', lote: null, solicitanteNome: null }],
};

describe('histórico de produto: projeção autorizada', () => {
  beforeEach(() => establishTestSession());

  it('consome somente os campos autorizados e mantém a unidade e ausência de lote do evento', async () => {
    server.use(http.get(url, () => HttpResponse.json({
      ...projection, estoqueAtual: 999,
      historico: [{ ...projection.historico[0], email: 'private@example.invalid', identificador: 'private-id',
        solicitante: { nome: 'Nome indevido', email: 'private@example.invalid' }, aprovador: { id: 9 } }],
    })));
    expect(await getProductHistoricoSaida({ id: 7 })).toEqual(projection);
  });

  it('mantém a resposta vazia autorizada com totais zero', async () => {
    const empty = { ...projection, historico: [], totalEmprestimos: 0, totalQuantidadeEmprestada: 0 };
    server.use(http.get(url, () => HttpResponse.json(empty)));
    expect(await getProductHistoricoSaida({ id: 7 })).toEqual(empty);
  });

  it('preserva a recusa 404 sem convertê-la em histórico vazio', async () => {
    server.use(http.get(url, () => HttpResponse.json({ code: 'resource_not_found' }, { status: 404 })));
    await expect(getProductHistoricoSaida({ id: 7 })).rejects.toMatchObject({ category: 'not_found' });
  });
});
