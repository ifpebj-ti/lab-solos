import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import UserIcon from '../../../public/icons/UserIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useCallback, useEffect, useState } from 'react';
import { SquareCheck, SquareX } from 'lucide-react';
import { approveLoan, getAllLoans, rejectLoan } from '@/integration/Loans';
import { toast } from '@/components/hooks/use-toast';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS, type OperationId } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import { formatDateTime } from '@/function/date';
import type { Emprestimo } from '@/contracts/loan';
import type { Usuario } from '@/contracts/user';
import {
  ResponsiveCell,
  ResponsiveRecord,
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
import {
  requireResponsiveColumns,
  useResponsiveColumns,
} from '@/components/global/table/responsiveContext';
import { Link, useNavigate } from 'react-router-dom';
import { buildDetailUrl } from '@/navigation/profileNavigation';

const loanRequestColumns: readonly ResponsiveColumn[] = [
  { key: 'requestedAt', label: 'Data de solicitação', weight: 2 },
  { key: 'name', label: 'Nome', weight: 3 },
  { key: 'email', label: 'Email', weight: 4 },
  { key: 'actions', label: 'Ações', weight: 2 },
];

const requesterName = (user: Usuario | null | undefined) =>
  user?.nomeCompleto ?? 'Não corresponde';

interface LoanRequestRowProps {
  data: readonly string[];
  rowIndex: number;
  id: number;
  itemLabel: string;
  pending: boolean;
  onReject: () => void;
  onApprove: () => void;
}

function LoanRequestRow({
  data,
  rowIndex,
  id,
  itemLabel,
  pending,
  onReject,
  onApprove,
}: LoanRequestRowProps) {
  const navigate = useNavigate();
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const detailUrl = buildDetailUrl('/admin/history/loan', id);
  const backgroundColor =
    rowIndex % 2 === 0 ? 'bg-surface' : 'bg-surface-muted';

  if (columns.length !== data.length + 1) {
    throw new Error(
      'Cada valor e a célula de ações devem corresponder às colunas responsivas.'
    );
  }

  return (
    <ResponsiveRecord
      className={`${backgroundColor} cursor-pointer hover:bg-surface-selected`}
      onClick={(event) => {
        if (
          (event.target as HTMLElement).closest(
            'a, button, input, select, textarea, [role="switch"], [role="checkbox"], [role="combobox"]'
          )
        ) {
          return;
        }
        navigate(detailUrl, { state: { id } });
      }}
    >
      {data.map((value, index) => (
        <ResponsiveCell key={columns[index].key} columnKey={columns[index].key}>
          {index === 0 ? (
            <Link
              to={detailUrl}
              state={{ id }}
              className='inline-flex min-h-11 min-w-11 max-w-full items-center rounded-sm underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-0 [@media(pointer:coarse)]:min-h-11'
            >
              {value}
            </Link>
          ) : (
            value
          )}
        </ResponsiveCell>
      ))}
      <ResponsiveCell columnKey={columns[data.length].key}>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <button
            type='button'
            aria-label={`Recusar ${itemLabel}`}
            disabled={pending}
            onClick={(event) => {
              event.stopPropagation();
              onReject();
            }}
            className='flex min-h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 disabled:cursor-wait disabled:opacity-50 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
          >
            <span aria-hidden='true'>
              <SquareX width={20} height={20} stroke='#dd1313' />
            </span>
          </button>
          <button
            type='button'
            aria-label={`Aprovar ${itemLabel}`}
            disabled={pending}
            onClick={(event) => {
              event.stopPropagation();
              onApprove();
            }}
            className='flex min-h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 disabled:cursor-wait disabled:opacity-50 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
          >
            <span aria-hidden='true'>
              <SquareCheck width={20} height={20} stroke='#16a34a' />
            </span>
          </button>
        </div>
      </ResponsiveCell>
    </ResponsiveRecord>
  );
}

function LoansRequest() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const [loan, setLoan] = useState<Emprestimo[] | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pendingLoanId, setPendingLoanId] = useState<number | null>(null);

  const fetchAllLoans = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await getAllLoans();
      const filteredLoans = response.filter(
        (currentLoan: { status: string }) => currentLoan.status === 'Pendente'
      );
      setLoan(filteredLoans);
      setLoadError(null);
      return true;
    } catch (error) {
      setLoadError(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllLoans();
  }, [fetchAllLoans]);

  const runDecision = async (
    loanId: number,
    mutation: (id: number) => Promise<unknown>,
    operation: OperationId,
    successToast: { title: string; description: string }
  ) => {
    if (pendingLoanId !== null) return;

    setPendingLoanId(loanId);
    try {
      await mutation(loanId);
      const refreshed = await fetchAllLoans();
      if (refreshed) toast(successToast);
    } catch (error) {
      notifyError(error, operation);
    } finally {
      setPendingLoanId(null);
    }
  };

  const handleApprove = (loanId: number) =>
    runDecision(loanId, approveLoan, OPERATION_IDS.approveLoan, {
      title: 'Solicitação aceita',
      description: 'Empréstimo autorizado para uso...',
    });

  const handleReject = (loanId: number) =>
    runDecision(loanId, rejectLoan, OPERATION_IDS.rejectLoan, {
      title: 'Solicitação rejeitada',
      description: 'Empréstimo não autorizado para uso...',
    });

  if (isLoading && loan === null) {
    return (
      <div role='status' className='flex min-h-svh w-full flex-row items-center justify-center gap-x-4 bg-canvas font-inter-medium text-foreground'>
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando...
      </div>
    );
  }

  if (loan === null) {
    return (
      <div className='flex min-h-svh w-full flex-col items-center justify-center overflow-y-auto bg-canvas p-6'>
        {loadError !== null && (
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.allLoans}
            onRetry={fetchAllLoans}
            onNavigate={() => navigate('/admin/all-loans')}
          />
        )}
      </div>
    );
  }

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers = loan.filter((user) =>
    requesterName(user.solicitante)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();
  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getUserCountText = (statusLoan: string) => {
    const count = loan.filter((user) => user.status === statusLoan).length;
    return `${count}`;
  };

  return (
    <div className='flex min-h-svh w-full flex-col items-center justify-start overflow-y-auto bg-canvas pb-9'>
      {loadError !== null && (
        <div className='w-11/12 mt-6'>
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.allLoans}
            onRetry={fetchAllLoans}
            onNavigate={() => navigate('/admin/all-loans')}
          />
        </div>
      )}
      <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
        <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl lg:text-3xl text-clt-2'>
          Solicitações de Empréstimos
        </h1>
        <div className='flex items-center justify-between gap-x-6'>
          <OpenSearch />
        </div>
      </div>
      <div className='w-11/12 mt-7 flex justify-center items-center md:justify-start gap-x-8'>
        <FollowUpCard
          title='Empréstimos'
          number={getUserCountText('Pendente')}
          icon={<UserIcon />}
        />
      </div>
      <div className='mt-10 mb-11 flex min-h-96 w-11/12 flex-col items-center rounded-xl border border-border bg-surface p-4 shadow-sm'>
        <div className='w-full min-w-0 flex flex-col-reverse lg:flex-row justify-between items-center mt-2 gap-4'>
          <div className='w-full min-w-0 lg:w-1/2 flex justify-start items-start gap-2'>
            <div className='w-auto flex items-center justify-evenly'>
              <TopDown
                onClick={() => toggleSortOrder(!isAscending)}
                top={isAscending}
              />
            </div>
            <div className='w-full flex items-center justify-evenly'>
              <SearchInput
                name='search'
                onChange={(event) => setSearchTerm(event.target.value)}
                value={searchTerm}
              />
            </div>
          </div>
        </div>
        <div className='w-full min-w-0 mt-4'>
          <ResponsiveTable
            label='Solicitações de empréstimo'
            columns={loanRequestColumns}
          >
            <div role='presentation'>
              <HeaderTable />
            </div>
            {currentData.length === 0 ? (
              <div
                role='listitem'
                className='flex min-h-72 flex-col items-center justify-center gap-3 font-inter-regular text-muted-foreground'
              >
                <div aria-hidden='true' className='text-6xl'>📋</div>
                <p className='text-center text-lg'>
                  {loan.length === 0
                    ? 'Nenhuma solicitação de empréstimo pendente.'
                    : 'Nenhuma solicitação encontrada para os filtros aplicados.'}
                </p>
                {loan.length === 0 && (
                  <p className='text-center text-sm'>
                    As solicitações de empréstimo aparecerão aqui quando usuários enviarem pedidos para aprovação.
                  </p>
                )}
              </div>
            ) : (
              currentData.map((rowData, index) => (
                <LoanRequestRow
                  key={rowData.id}
                  data={[
                    formatDateTime(String(rowData.dataRealizacao)) ||
                      'Não corresponde',
                    requesterName(rowData.solicitante),
                    rowData.solicitante?.email || 'Não corresponde',
                  ]}
                  rowIndex={index}
                  id={rowData.id}
                  itemLabel={requesterName(rowData.solicitante)}
                  pending={pendingLoanId === rowData.id}
                  onReject={() => handleReject(rowData.id)}
                  onApprove={() => handleApprove(rowData.id)}
                />
              ))
            )}
          </ResponsiveTable>
        </div>
        {currentData.length > 0 && loan.length > 0 && (
          <div className='mt-auto'>
            <Pagination
              totalItems={sortedUsers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default LoansRequest;
