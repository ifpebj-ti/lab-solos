import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { useCallback, useEffect, useRef, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { formatDate } from '@/function/date';
import { getLoansById, returnLoan } from '@/integration/Loans';
import { useLocation, useNavigate } from 'react-router-dom';
import ItemReturn from '@/components/global/table/ItemReturn';
import ItemTable from '@/components/global/table/Item';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import { toast } from '@/components/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import BackLink from '@/components/global/BackLink';
import type { Emprestimo } from '@/contracts/loan';
import type { Usuario } from '@/contracts/user';
import { buildDetailUrl, readIdFromLocation } from '@/navigation/profileNavigation';

const readOnlyColumns: readonly ResponsiveColumn[] = [
  { key: 'item', label: 'Item', weight: 4 },
  { key: 'quantity', label: 'Quantidade', weight: 2 },
  { key: 'unit', label: 'Unidade de Medida', weight: 2 },
  { key: 'batch', label: 'Lote ID', weight: 2 },
];

const glasswareColumns: readonly ResponsiveColumn[] = [
  { key: 'item', label: 'Item', weight: 4 },
  { key: 'quantity', label: 'Quantidade', weight: 2 },
  { key: 'return', label: 'Devolução', weight: 2 },
  { key: 'reason', label: 'Justificativa', weight: 4 },
];

const otherReturnColumns: readonly ResponsiveColumn[] = [
  ...readOnlyColumns,
  { key: 'return', label: 'Devolução', weight: 2 },
  { key: 'reason', label: 'Justificativa', weight: 4 },
];

const userName = (user: Usuario | null) => user?.nomeCompleto ?? 'Não informado';

export type {
  Emprestimo as IEmprestimo,
  Lote as ILote,
  Produto as IProduto,
  ProdutoEmprestado as IEmprestimoProduto,
} from '@/contracts/loan';

function ReturnLoan() {
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<Emprestimo | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const idResolution = readIdFromLocation(location);
  const requestSequence = useRef(0);
  const hasValidQueryId = idResolution.source === 'query' && idResolution.id !== null;
  const hasLegacyId = idResolution.source === 'state' && idResolution.id !== null;

  useEffect(() => {
    if (!hasLegacyId || idResolution.id === null) return;

    navigate(
      buildDetailUrl(`${location.pathname}${location.search}`, idResolution.id),
      { replace: true, state: null }
    );
  }, [hasLegacyId, idResolution.id, location.pathname, location.search, navigate]);

  const fetchLoan = useCallback(async (): Promise<boolean> => {
    if (!hasValidQueryId || idResolution.id === null) {
      setLoading(false);
      setLoans(null);
      setLoadError(null);
      return false;
    }

    const sequence = ++requestSequence.current;
    setLoading(true);
    setLoans(null);
    setLoadError(null);
    try {
      const loansResponse = await getLoansById({ id: idResolution.id });
      if (sequence !== requestSequence.current) return false;
      setLoans(loansResponse);
      setLoadError(null);
      return true;
    } catch (error) {
      if (sequence !== requestSequence.current) return false;
      setLoadError(error);
      return false;
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [hasValidQueryId, idResolution.id]);

  useEffect(() => {
    void fetchLoan();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchLoan]);

  const handleReturn = async () => {
    if (!loans || isReturning) return;

    setIsReturning(true);
    try {
      await returnLoan(loans.id);
      if (!(await fetchLoan())) return;
      toast({
        title: 'Devolução registrada',
        description: 'A devolução do empréstimo foi registrada com sucesso!',
      });
    } catch (error) {
      notifyError(error, OPERATION_IDS.returnLoan);
    } finally {
      setIsReturning(false);
    }
  };

  const infoItems = loans
    ? [
        {
          title: 'Nome',
          value: userName(loans.solicitante),
          width: '40%',
        },
        {
          title: 'Email',
          value: loans.solicitante?.email ?? 'Não informado',
          width: '30%',
        },
        {
          title: 'Telefone',
          value: loans.solicitante?.telefone ?? 'Não informado',
          width: '30%',
        },
      ]
    : [];
  const infoItems3 = loans
    ? [
        {
          title: 'Responsável',
          value:
            loans.solicitante?.responsavel?.nomeCompleto ?? 'Não Corresponde',
          width: '100%',
        },
      ]
    : [];
  const infoItems4 = loans
    ? [
        {
          title: 'Data de Realização',
          value: formatDate(loans?.dataRealizacao),
          width: '100%',
        },
      ]
    : [];

  const produtosQuimicos =
    loans?.produtos.filter((p) => p.produto.tipoProduto === 'Quimico') || [];

  const produtosVidraria =
    loans?.produtos.filter((p) => p.produto.tipoProduto === 'Vidraria') || [];

  const produtosOutros =
    loans?.produtos.filter(
      (p) => !['Quimico', 'Vidraria'].includes(p.produto.tipoProduto)
    ) || [];

  if (hasLegacyId || (hasValidQueryId && loading && loans === null && loadError === null)) {
    return (
      <div
        role='status'
        className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'
      >
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando...
        <BackLink pathname='/admin/return' />
      </div>
    );
  }

  if (!hasValidQueryId || loans === null) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-backgroundMy p-6'>
        {loadError !== null ? (
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.loanById}
            onRetry={fetchLoan}
            onNavigate={() => navigate('/admin/all-loans')}
          />
        ) : (
          <p>Selecione um registro para consultar</p>
        )}
        <BackLink pathname='/admin/return' />
      </div>
    );
  }

  return (
    <>
      <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
        {loadError !== null && (
          <div className='w-11/12 mt-6'>
            <ErrorFeedback
              error={loadError}
              operationId={OPERATION_IDS.loanById}
              onRetry={fetchLoan}
              onNavigate={() => navigate('/admin/all-loans')}
            />
          </div>
        )}
          <div className='w-11/12 mt-5'>
            <BackLink pathname='/admin/return' />
          </div>
          <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
            <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl lg:text-3xl text-clt-2'>
              Devolução de Empréstimo
            </h1>
            <div className='flex min-w-0 flex-wrap items-center justify-between gap-4'>
              {loans?.status === 'Aprovado' && !loans?.dataDevolucao && (
                <button
                  type='button'
                  onClick={handleReturn}
                  disabled={isReturning}
                  className='font-rajdhani-semibold text-white bg-green-600 text-base h-10 px-4 rounded-md hover:bg-green-700 flex gap-x-2 items-center justify-center transition-all ease-in-out duration-150'
                >
                  <RefreshCw width={18} />
                  Registrar Devolução
                </button>
              )}
              {loans?.status === 'Aprovado' && loans?.dataDevolucao && (
                <div className='flex items-center gap-x-2 text-green-600 font-rajdhani-semibold'>
                  <RefreshCw width={18} />
                  Devolvido
                </div>
              )}
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-w-0 mt-7'>
            <InfoContainer items={infoItems} />
            <div className='w-full min-w-0 flex flex-col md:flex-row gap-5 mt-5'>
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
            </div>
          </div>
          {produtosQuimicos.length > 0 && (
            <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Químicos
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
                <ResponsiveTable label='Químicos' columns={readOnlyColumns}>
                  <HeaderTable />
                  <div className='w-full items-center flex flex-col min-h-14'>
                    {produtosQuimicos.map((row, rowIndex) => (
                      <ItemTable
                        key={`${row.emprestimoId}-${row.produto.id}`}
                        data={[
                          row.produto.nomeProduto,
                          row.produto.quantidade.toString(),
                          row.produto.unidadeMedida ?? 'Não informado',
                          row.produto.lote?.codigoLote ?? 'Não informado',
                        ]}
                        rowIndex={rowIndex}
                      />
                    ))}
                  </div>
                </ResponsiveTable>
              </div>
            </div>
          )}
          {produtosVidraria.length > 0 && (
            <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Vidrarias
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
                <ResponsiveTable label='Vidrarias' columns={glasswareColumns}>
                  <HeaderTable />
                  <div className='w-full items-center flex flex-col min-h-14'>
                    {produtosVidraria.map((row, rowIndex) => (
                      <ItemReturn
                        key={`${row.emprestimoId}-${row.produto.id}`}
                        data={[
                          row.produto.nomeProduto,
                          row.produto.quantidade.toString(),
                        ]}
                        rowIndex={rowIndex}
                        rowId={`${row.emprestimoId}-${row.produto.id}`}
                      />
                    ))}
                  </div>
                </ResponsiveTable>
              </div>
            </div>
          )}
          {produtosOutros.length > 0 && (
            <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Outros
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
                <ResponsiveTable label='Outros' columns={otherReturnColumns}>
                  <HeaderTable />
                  <div className='w-full items-center flex flex-col min-h-14'>
                    {produtosOutros.map((row, rowIndex) => (
                      <ItemReturn
                        key={`${row.emprestimoId}-${row.produto.id}`}
                        data={[
                          row.produto.nomeProduto,
                          row.produto.quantidade.toString(),
                          row.produto.unidadeMedida ?? 'Não informado',
                          row.produto.lote?.codigoLote ?? 'Não informado',
                        ]}
                        rowIndex={rowIndex}
                        rowId={`${row.emprestimoId}-${row.produto.id}`}
                      />
                    ))}
                  </div>
                </ResponsiveTable>
              </div>
            </div>
          )}
        </div>
    </>
  );
}

export default ReturnLoan;
