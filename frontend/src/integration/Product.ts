import { api } from '../services/BaseApi';
import { parseResourceId } from '@/contracts/identifier';

import { OPERATION_IDS } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

interface IGetProductById {
  id: number;
}

export type ProductAlertReason = 'validade' | 'estoque_abaixo_minimo';

export interface AdminProductCatalogItem {
  id: number;
  catmat: string;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string | null;
  unidadeMedida: string | null;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string | null;
  dataFabricacao: string | null;
  dataValidade: string | null;
  ultimaModificacao: string;
  status: string | null;
  lote: unknown | null;
  capacidadeMl: number | null;
  motivosAlerta: ProductAlertReason[];
}

export interface ProductCatalogItem {
  id: number;
  catmat?: string | null;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor?: string | null;
  unidadeMedida?: string | null;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto?: string | null;
  dataFabricacao?: string | null;
  dataValidade?: string | null;
  ultimaModificacao?: string;
  status?: string | null;
  lote?: unknown | null;
}

interface PaginatedResponse<TItem> {
  itens: TItem[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
}

const PRODUCT_PAGE_SIZE = 100;

async function getAllProductPages<TItem>(url: string): Promise<TItem[]> {
  const requestPage = (pagina: number) =>
    api<PaginatedResponse<TItem>>({
      method: 'GET',
      url,
      params: { pagina, tamanhoPagina: PRODUCT_PAGE_SIZE },
    });

  const firstPage = await requestPage(1);
  if (
    !Array.isArray(firstPage.data.itens) ||
    !Number.isSafeInteger(firstPage.data.totalPaginas) ||
    firstPage.data.totalPaginas < 0
  ) {
    throw new Error('A resposta da listagem de produtos está inválida.');
  }

  const products = [...firstPage.data.itens];
  for (let pagina = 2; pagina <= firstPage.data.totalPaginas; pagina += 1) {
    const nextPage = await requestPage(pagina);
    if (!Array.isArray(nextPage.data.itens)) {
      throw new Error('A resposta da listagem de produtos está inválida.');
    }
    products.push(...nextPage.data.itens);
  }
  return products;
}

export const getProductById = async ({ id }: IGetProductById) => {
  try {

    const response = await api({
      method: 'GET',
      url: `Produtos/${parseResourceId(id)}`,
    });
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.productById);
  }
};

export const getAllProducts = async () => {
  try {

    return await getAllProductPages<ProductCatalogItem>('Produtos');
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.products);
  }
};

export const getAdminProductCatalog = async (): Promise<
  AdminProductCatalogItem[]
> => {
  try {


    return await getAllProductPages<AdminProductCatalogItem>(
      'Produtos/catalogo-administrativo'
    );
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.products);
  }
};

export const getAlertProducts = async () => {
  try {

    const response = await api({
      method: 'GET',
      url: `Produtos/emAlerta`,
    });
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.alertProducts);
  }
};
interface IProduto {
  nomeProduto: string;
  fornecedor?: string;
  tipo: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto?: string;
  dataFabricacao?: string | null;
  dataValidade?: string | null;
  catmat?: string;
  unidadeMedida?: string;
  estadoFisico?: string;
  cor?: string;
  odor?: string;
  formulaQuimica?: string;
  pesoMolecular?: number;
  densidade?: number;
  grauPureza?: string;
  grupo?: string;
  material?: string;
  formato?: string;
  altura?: string;
  capacidade?: number;
  graduada?: boolean;
}

export const createProduct = async (dados: IProduto) => {
  try {


    const response = await api.post('/produtos', dados, {
    });

    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.createProduct);
  }
};

interface IHistoricoSaidaProduto {
  id: number;
}

export interface HistoricoSaidaItem {
  emprestimoId: number;
  dataSaida: string;
  quantidadeEmprestada: number;
  unidadeMedida: string;
  lote: string | null;
  solicitanteNome?: string | null;
}

export interface HistoricoSaidaProdutoResponse {
  produtoId: number;
  nomeProduto: string;
  tipoProduto: string;
  unidadeMedida: string;
  historico: HistoricoSaidaItem[];
  totalEmprestimos: number;
  totalQuantidadeEmprestada: number;
}

export const getProductHistoricoSaida = async ({
  id,
}: IHistoricoSaidaProduto): Promise<HistoricoSaidaProdutoResponse> => {
  try {


    const response = await api({
      method: 'GET',
      url: `Produtos/${parseResourceId(id)}/historico-saida`,
    });

    const result = response.data as HistoricoSaidaProdutoResponse;
    return {
      produtoId: result.produtoId,
      nomeProduto: result.nomeProduto,
      tipoProduto: result.tipoProduto,
      unidadeMedida: result.unidadeMedida,
      totalEmprestimos: result.totalEmprestimos,
      totalQuantidadeEmprestada: result.totalQuantidadeEmprestada,
      historico: result.historico.map((item) => ({
        emprestimoId: item.emprestimoId,
        dataSaida: item.dataSaida,
        quantidadeEmprestada: item.quantidadeEmprestada,
        unidadeMedida: item.unidadeMedida,
        lote: item.lote ?? null,
        solicitanteNome: item.solicitanteNome ?? null,
      })),
    };
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.productHistory);
  }
};

interface IUpdateProduct {
  id: number;
  operations: Array<{
    op: 'replace' | 'add' | 'remove';
    path: string;
    value?: string | number | boolean | null;
  }>;
}

export const updateProduct = async ({ id, operations }: IUpdateProduct) => {
  try {


    const response = await api({
      method: 'PATCH',
      url: `Produtos/${parseResourceId(id)}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: operations,
    });
    return response.data;
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.updateProduct);
  }
};
