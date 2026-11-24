import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
import {
  getProductHistoricoSaida,
  type HistoricoSaidaItem,
  type HistoricoSaidaProdutoResponse,
} from '@/integration/Product';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingIcon from '@/components/icons/LoadingIcon';
import { getUnidadePlural } from '@/mocks/Unidades';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { createApplicationError } from '@/errors/applicationError';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { parsePositiveId } from '@/navigation/profileNavigation';

const formatHistoryDate = (dateString: string) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? 'Data não informada'
    : format(date, 'dd/MM/yyyy', { locale: ptBR });
};

export default function ProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<HistoricoSaidaProdutoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [filteredData, setFilteredData] = useState<HistoricoSaidaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
      const query = searchTerm.trim().toLocaleLowerCase('pt-BR');
      filtered = filtered.filter(
        (item) =>
          [
            item.emprestimoId.toString(),
            formatHistoryDate(item.dataSaida),
            item.dataSaida,
            item.solicitanteNome ?? '',
            item.lote ?? '',
            item.quantidadeEmprestada.toString(),
            item.unidadeMedida,
          ]
            .join(' ')
            .toLocaleLowerCase('pt-BR')
            .includes(query)
      );
    }

    setFilteredData(filtered);
  }, [searchTerm, data]);

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
          className='mr-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy text-clt-2 transition-colors hover:bg-surface-selected focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className='text-2xl font-rajdhani-medium text-clt-2'>Historico do produto</h1>
      </div>

      {/* Product Info */}
      <section className='mb-6 rounded-xl border border-borderMy bg-surface p-4 shadow-xs sm:p-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <label className='text-sm font-medium text-clt-1'>Item</label>
            <p className='wrap-break-word text-lg font-semibold text-clt-2'>
              {data.nomeProduto}
            </p>
          </div>
          <div>
            <label className='text-sm font-medium text-clt-1'>Tipo</label>
            <p className='wrap-break-word text-lg font-semibold text-clt-2'>
              {data.tipoProduto}
            </p>
          </div>
        </div>
      </section>

      {/* History Table */}
      <section className='rounded-xl border border-borderMy bg-surface p-4 shadow-xs sm:p-6'>
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
                className='min-h-11 w-full rounded-md border border-borderMy bg-surface py-2 pl-10 pr-4 text-clt-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                  Empréstimo
                </th>
                <th className='px-4 py-3 text-left font-medium text-clt-1'>
                  Solicitante
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
                    {formatHistoryDate(item.dataSaida)}
                  </td>
                  <td className='py-3 px-4'>{item.emprestimoId}</td>
                  <td className='py-3 px-4'>{item.solicitanteNome || '—'}</td>
                  <td className='py-3 px-4'>{item.lote || 'Sem lote'}</td>
                  <td className='py-3 px-4'>
                    {item.quantidadeEmprestada}{' '}
                    {getUnidadePlural(
                      item.unidadeMedida,
                      item.quantidadeEmprestada
                    )}
                  </td>
                  <td className='px-4 py-3 wrap-break-word'>{item.unidadeMedida}</td>
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
