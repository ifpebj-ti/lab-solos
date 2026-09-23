import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Calendar } from 'lucide-react';
import { getProductHistoricoSaida } from '@/integration/Product';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingIcon from '@/components/icons/LoadingIcon';
import { getUnidadePlural } from '@/mocks/Unidades';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { createApplicationError } from '@/errors/applicationError';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { parsePositiveId } from '@/navigation/profileNavigation';

interface UsuarioEmprestimo {
  id: number;
  nome: string;
  email: string;
  instituicao: string | null;
}

interface HistoricoSaidaItem {
  emprestimoId: number;
  dataEmprestimo: string;
  dataPrevistaDevolucao: string | null;
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
  const [error, setError] = useState<unknown | null>(null);
  const [filteredData, setFilteredData] = useState<HistoricoSaidaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('');
  const requestSequence = useRef(0);

  const fetchData = useCallback(async () => {
    const productId = parsePositiveId(id);

    if (productId === null) {
      setData(null);
      setError(
        createApplicationError({
          category: 'not_found',
          message: 'Identificador de produto ausente.',
          retryable: false,
        })
      );
      setLoading(false);
      return;
    }

    const sequence = ++requestSequence.current;
    setLoading(true);
    setData(null);
    setError(null);

    try {
      const response = await getProductHistoricoSaida({ id: productId });
      if (sequence !== requestSequence.current) return;
      setData(response);
      setFilteredData(response.historico);
      setError(null);
    } catch (err) {
      if (sequence === requestSequence.current) setError(err);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchData]);

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
    const date = new Date(dateString);
    return Number.isNaN(date.getTime())
      ? 'Data nao informada'
      : format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading && !data) {
    return (
      <div
        role='status'
        className='flex min-h-[50vh] items-center justify-center bg-canvas text-clt-2'
      >
        <LoadingIcon />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className='flex min-h-[50vh] items-center justify-center bg-canvas p-4 text-clt-2 sm:p-6'>
        <ErrorFeedback
          error={error}
          operationId={OPERATION_IDS.productHistory}
          onRetry={fetchData}
          onNavigate={() => navigate('/admin/search-material')}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className='flex min-h-screen w-full flex-col bg-canvas p-4 text-clt-2 sm:p-6 lg:p-8'>
      {error !== null && (
        <div className='mb-6'>
          <ErrorFeedback
            error={error}
            operationId={OPERATION_IDS.productHistory}
            onRetry={fetchData}
            onNavigate={() => navigate('/admin/search-material')}
          />
        </div>
      )}
      {/* Header */}
      <div className='mb-6 flex items-center'>
        <button
          onClick={() => navigate('/admin/search-material')}
          aria-label='Voltar para busca de materiais'
          title='Voltar para busca de materiais'
          className='mr-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy text-clt-2 transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className='text-2xl font-rajdhani-medium text-clt-2'>Historico do produto</h1>
      </div>

      {/* Product Info */}
      <section className='mb-6 rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div>
            <label className='text-sm font-medium text-clt-1'>Item</label>
            <p className='break-words text-lg font-semibold text-clt-2'>
              {data.nomeProduto}
            </p>
          </div>
          <div>
            <label className='text-sm font-medium text-clt-1'>Tipo</label>
            <p className='break-words text-lg font-semibold text-clt-2'>
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

        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
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
      </section>

      {/* Chart Section */}
      <section className='mb-6 rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'>
        <div className='mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          <h2 className='text-xl font-semibold text-gray-800'>
            Gráfico de Movimentação de Estoque
          </h2>
          <div className='flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
            <div className='flex items-center gap-2'>
              <Calendar size={16} />
              <input
                type='text'
                placeholder='20/01/2022 - 09/02/2022'
                aria-label='Filtrar por periodo'
                className='min-h-11 w-full rounded-md border border-borderMy bg-surface px-3 py-2 text-sm text-clt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto'
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              />
            </div>
            <select aria-label='Selecionar periodo' className='min-h-11 w-full rounded-md border border-borderMy bg-surface px-3 py-2 text-sm text-clt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto'>
              <option>Selecione</option>
            </select>
          </div>
        </div>

        {/* Placeholder for chart */}
        <div className='flex h-64 items-center justify-center rounded-lg border border-dashed border-borderMy bg-surface-muted p-4'>
          <p className='text-center text-clt-1'>
            Gráfico de movimentação será implementado aqui
          </p>
        </div>
      </section>

      {/* History Table */}
      <section className='rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'>
        <div className='mb-4 flex flex-col gap-4'>
          <div className='flex items-center gap-4'>
            <div className='relative'>
              <Search
                className='absolute left-3 top-1/2 -translate-y-1/2 text-clt-1'
                size={16}
              />
              <input
                type='text'
                placeholder='Buscar...'
                aria-label='Buscar no historico'
                className='min-h-11 w-full rounded-md border border-borderMy bg-surface py-2 pl-10 pr-4 text-clt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Calendar size={16} />
              <input
                type='text'
                placeholder='20/01/2022 - 09/02/2022'
                aria-label='Filtrar historico por periodo'
                className='min-h-11 w-full rounded-md border border-borderMy bg-surface px-3 py-2 text-sm text-clt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto'
              />
            </div>
            <select aria-label='Selecionar filtro do historico' className='min-h-11 w-full rounded-md border border-borderMy bg-surface px-3 py-2 text-sm text-clt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto'>
              <option>Selecione</option>
            </select>
          </div>
        </div>

        <div className='w-full min-w-0 overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-borderMy'>
                <th className='px-4 py-3 text-left font-medium text-clt-1'>
                  Data
                </th>
                <th className='px-4 py-3 text-left font-medium text-clt-1'>
                  Utilizador
                </th>
                <th className='px-4 py-3 text-left font-medium text-clt-1'>
                  Identificador
                </th>
                <th className='px-4 py-3 text-left font-medium text-clt-1'>
                  Lote
                </th>
                <th className='px-4 py-3 text-left font-medium text-clt-1'>
                  Quantidade
                </th>
                <th className='px-4 py-3 text-left font-medium text-clt-1'>
                  Unidade
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr
                  key={item.emprestimoId}
                  className='border-b border-borderMy hover:bg-surface-selected'
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
                  <td className='px-4 py-3 break-words'>{data.unidadeMedida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className='py-8 text-center'>
            <p className='text-clt-1'>Nenhum registro encontrado</p>
          </div>
        )}

        {/* Summary */}
        <div className='mt-6 flex flex-col items-start gap-2 text-sm text-clt-1 sm:flex-row sm:items-center sm:justify-between'>
          <p>Total de empréstimos: {data.totalEmprestimos}</p>
          <p>
            Total emprestado: {data.totalQuantidadeEmprestada}{' '}
            {getUnidadePlural(
              data.unidadeMedida,
              data.totalQuantidadeEmprestada
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
