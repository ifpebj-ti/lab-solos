import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

interface IGetProductById {
  id: number;
}

export const getProductById = async ({ id }: IGetProductById) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Produtos/${id}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao buscar produtos', error);
    }
    throw error;
  }
};

export const getAllProducts = async () => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Produtos`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.debug('Error fetching products:', error);
    throw error;
  }
};

export const getAlertProducts = async () => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Produtos/emAlerta`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.debug('Error fetching products:', error);
    throw error;
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
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api.post('/produtos', dados, {
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao criar produto:', error);
    }
    throw error;
  }
};

interface IHistoricoSaidaProduto {
  id: number;
}

interface UsuarioEmprestimo {
  id: number;
  nome: string;
  email: string;
  instituicao: string | null;
}

interface HistoricoSaidaItem {
  emprestimoId: number;
  dataEmprestimo: string;
  dataDevolucao: string | null;
  quantidadeEmprestada: number;
  statusEmprestimo: string;
  solicitante: UsuarioEmprestimo;
  aprovador: UsuarioEmprestimo | null;
  identificador: string;
  lote: string | null;
}

interface HistoricoSaidaProdutoResponse {
  produtoId: number;
  nomeProduto: string;
  tipoProduto: string;
  estoqueAtual: number;
  unidadeMedida: string;
  historico: HistoricoSaidaItem[];
  totalEmprestimos: number;
  totalQuantidadeEmprestada: number;
}

export const getProductHistoricoSaida = async ({
  id,
}: IHistoricoSaidaProduto): Promise<HistoricoSaidaProdutoResponse> => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'GET',
      url: `Produtos/${id}/historico-saida`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao buscar histórico de saída do produto:', error);
    }
    throw error;
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
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `Produtos/${id}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
        'Content-Type': 'application/json',
      },
      data: operations,
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Erro ao atualizar produto', error);
    }
    throw error;
  }
};
