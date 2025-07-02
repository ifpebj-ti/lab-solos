import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Calendar } from 'lucide-react';
import { getProductHistoricoSaida } from '@/integration/Product';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingIcon from '@/components/icons/LoadingIcon';
import { getUnidadePlural } from '@/mocks/Unidades';

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

export default function ProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<HistoricoSaidaProdutoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<HistoricoSaidaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await getProductHistoricoSaida({ id: parseInt(id) });
        setData(response);
        setFilteredData(response.historico);
      } catch (err) {
        setError('Erro ao carregar histórico do produto');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!data) return;

    let filtered = data.historico;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.solicitante.nome
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.identificador.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.lote?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredData(filtered);
  }, [searchTerm, data]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <LoadingIcon />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <p className='text-red-500 mb-4'>
            {error || 'Produto não encontrado'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col w-full min-h-screen bg-gray-50 p-6'>
      {/* Header */}
      <div className='flex items-center mb-6'>
        <button
          onClick={() => navigate(-1)}
          className='mr-4 p-2 hover:bg-gray-200 rounded-md transition-colors'
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className='text-2xl font-bold text-gray-800'>PESQUISA</h1>
      </div>

      {/* Product Info */}
      <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div>
            <label className='text-sm font-medium text-gray-600'>Item</label>
            <p className='text-lg font-semibold text-gray-800'>
              {data.nomeProduto}
            </p>
          </div>
          <div>
            <label className='text-sm font-medium text-gray-600'>Tipo</label>
            <p className='text-lg font-semibold text-gray-800'>
              {data.tipoProduto}
            </p>
          </div>
          <div>
            <label className='text-sm font-medium text-gray-600'>
              Situação
            </label>
            <p className='text-lg font-semibold text-green-600'>Disponível</p>
          </div>
          <div>
            <label className='text-sm font-medium text-gray-600'>
              Data de Validade
            </label>
            <p className='text-lg font-semibold text-red-600'>Data inválida</p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
          <div>
            <label className='text-sm font-medium text-gray-600'>
              Estoque Atual
            </label>
            <p className='text-lg font-semibold text-gray-800'>
              {data.estoqueAtual}{' '}
              {getUnidadePlural(data.unidadeMedida, data.estoqueAtual)}
            </p>
          </div>
          <div>
            <label className='text-sm font-medium text-gray-600'>
              Última Modificação do Estoque
            </label>
            <p className='text-lg font-semibold text-gray-800'>Data inválida</p>
          </div>
          <div>
            <label className='text-sm font-medium text-gray-600'>
              Localização
            </label>
            <p className='text-lg font-semibold text-gray-800'>
              Armário de EPIs
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold text-gray-800'>
            Gráfico de Movimentação de Estoque
          </h2>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <Calendar size={16} />
              <input
                type='text'
                placeholder='20/01/2022 - 09/02/2022'
                className='border border-gray-300 rounded px-3 py-1 text-sm'
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              />
            </div>
            <select className='border border-gray-300 rounded px-3 py-1 text-sm'>
              <option>Selecione</option>
            </select>
          </div>
        </div>

        {/* Placeholder for chart */}
        <div className='h-64 bg-gray-100 rounded flex items-center justify-center'>
          <p className='text-gray-500'>
            Gráfico de movimentação será implementado aqui
          </p>
        </div>
      </div>

      {/* History Table */}
      <div className='bg-white rounded-lg shadow-sm p-6'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-4'>
            <div className='relative'>
              <Search
                className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                size={16}
              />
              <input
                type='text'
                placeholder='Buscar...'
                className='pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Calendar size={16} />
              <input
                type='text'
                placeholder='20/01/2022 - 09/02/2022'
                className='border border-gray-300 rounded px-3 py-1 text-sm'
              />
            </div>
            <select className='border border-gray-300 rounded px-3 py-1 text-sm'>
              <option>Selecione</option>
            </select>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className='text-left py-3 px-4 font-medium text-gray-600'>
                  Data
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-600'>
                  Utilizador
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-600'>
                  Identificador
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-600'>
                  Lote
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-600'>
                  Quantidade
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr
                  key={item.emprestimoId}
                  className='border-b border-gray-100 hover:bg-gray-50'
                >
                  <td className='py-3 px-4'>
                    {formatDate(item.dataEmprestimo)}
                  </td>
                  <td className='py-3 px-4'>{item.solicitante.nome}</td>
                  <td className='py-3 px-4'>{item.identificador}</td>
                  <td className='py-3 px-4'>{item.lote || 'Sem lote'}</td>
                  <td className='py-3 px-4'>
                    {item.quantidadeEmprestada}{' '}
                    {getUnidadePlural(
                      data.unidadeMedida,
                      item.quantidadeEmprestada
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className='text-center py-8'>
            <p className='text-gray-500'>Nenhum registro encontrado</p>
          </div>
        )}

        {/* Summary */}
        <div className='mt-6 flex justify-between items-center text-sm text-gray-600'>
          <p>Total de empréstimos: {data.totalEmprestimos}</p>
          <p>
            Total emprestado: {data.totalQuantidadeEmprestada}{' '}
            {getUnidadePlural(
              data.unidadeMedida,
              data.totalQuantidadeEmprestada
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
