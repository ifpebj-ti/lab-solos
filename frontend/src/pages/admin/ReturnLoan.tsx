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
        className='flex min-h-svh w-full items-center justify-center gap-x-3 bg-canvas font-inter-medium text-clt-2'
      >
        <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
          <LoadingIcon />
        </div>
        Carregando...
        <BackLink pathname='/admin/return' />
      </div>
    );
  }

  if (!hasValidQueryId || loans === null) {
    return (
      <main className='flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas p-6 text-clt-2'>
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
      </main>
    );
  }

  return (
    <>
      <main className='mx-auto flex min-h-svh w-full max-w-7xl flex-col items-center overflow-y-auto bg-canvas px-4 pb-12 text-clt-2 sm:px-6 lg:px-8'>
        {loadError !== null && (
          <div className='mt-6 w-full'>
            <ErrorFeedback
              error={loadError}
              operationId={OPERATION_IDS.loanById}
              onRetry={fetchLoan}
              onNavigate={() => navigate('/admin/all-loans')}
            />
          </div>
        )}
          <div className='mt-5 w-full'>
            <BackLink pathname='/admin/return' />
          </div>
          <div className='mt-7 flex w-full min-w-0 flex-wrap items-center justify-between gap-4'>
            <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl lg:text-3xl text-clt-2'>
              Devolução de Empréstimo
            </h1>
            <div className='flex min-w-0 flex-wrap items-center justify-between gap-4'>
              {loans?.status === 'Aprovado' && !loans?.dataDevolucao && (
                <button
                  type='button'
                  onClick={handleReturn}
                  disabled={isReturning}
                  className='flex min-h-11 items-center justify-center gap-x-2 rounded-md bg-success px-4 text-base font-rajdhani-semibold text-on-success transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <RefreshCw className='text-on-success' width={18} />
                  Registrar Devolução
                </button>
              )}
              {loans?.status === 'Aprovado' && loans?.dataDevolucao && (
                <div className='flex items-center gap-x-2 font-rajdhani-semibold text-success'>
                  <RefreshCw className='text-success' width={18} />
                  Devolvido
                </div>
              )}
              <OpenSearch />
            </div>
          </div>
          <div className='mt-7 w-full min-w-0'>
            <InfoContainer items={infoItems} />
            <div className='mt-5 flex w-full min-w-0 flex-col gap-5 md:flex-row'>
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
            </div>
          </div>
          {produtosQuimicos.length > 0 && (
            <section aria-label='QuÃ­micos' className='mt-7 flex min-h-32 w-full min-w-0 flex-col rounded-xl border border-borderMy bg-surface'>
              <div className='flex w-full items-center justify-between rounded-t-md border-b border-borderMy p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Químicos
                </p>
              </div>
              <div className='flex w-full min-w-0 flex-col items-center justify-center px-4'>
                <ResponsiveTable label='Químicos' columns={readOnlyColumns}>
                  <HeaderTable />
                  <div className='flex min-h-14 w-full flex-col items-center'>
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
            </section>
          )}
          {produtosVidraria.length > 0 && (
            <section aria-label='Vidrarias' className='mt-7 flex min-h-32 w-full min-w-0 flex-col rounded-xl border border-borderMy bg-surface'>
              <div className='flex w-full items-center justify-between rounded-t-md border-b border-borderMy p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Vidrarias
                </p>
              </div>
              <div className='flex w-full min-w-0 flex-col items-center justify-center px-4'>
                <ResponsiveTable label='Vidrarias' columns={glasswareColumns}>
                  <HeaderTable />
                  <div className='flex min-h-14 w-full flex-col items-center'>
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
            </section>
          )}
          {produtosOutros.length > 0 && (
            <section aria-label='Outros' className='mt-7 flex min-h-32 w-full min-w-0 flex-col rounded-xl border border-borderMy bg-surface'>
              <div className='flex w-full items-center justify-between rounded-t-md border-b border-borderMy p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Outros
                </p>
              </div>
              <div className='flex w-full min-w-0 flex-col items-center justify-center px-4'>
                <ResponsiveTable label='Outros' columns={otherReturnColumns}>
                  <HeaderTable />
                  <div className='flex min-h-14 w-full flex-col items-center'>
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
            </section>
          )}
        </main>
    </>
  );
}

export default ReturnLoan;
