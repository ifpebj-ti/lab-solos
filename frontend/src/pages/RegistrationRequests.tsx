import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import UserIcon from '../../public/icons/UserIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useCallback, useEffect, useState } from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, SquareCheck, SquareX } from 'lucide-react';
import Cookie from 'js-cookie';
import {
  getDependentesForApproval,
  rejectDependente,
} from '@/integration/Class';
import { approveDependente } from '../integration/Class';
import { toast } from '@/components/hooks/use-toast';
import { displayUserValue, formatCivilDate } from '@/function/date';
import type { Dependente } from '@/contracts/user';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import { resolveParentPath } from '@/navigation/profileNavigation';
import {
  ResponsiveCell,
  ResponsiveRecord,
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';

const requestColumns: readonly ResponsiveColumn[] = [
  { key: 'date', label: 'Data de solicitação', weight: 2 },
  { key: 'name', label: 'Nome', weight: 3 },
  { key: 'email', label: 'Email', weight: 2 },
  { key: 'institution', label: 'Instituição', weight: 2 },
  { key: 'actions', label: 'Ações', weight: 1 },
];

type RegistrationAction = 'approve' | 'reject';
type PendingAction = Readonly<{
  id: number;
  action: RegistrationAction;
}>;

const actionButtonClassName =
  'flex min-h-11 min-w-11 items-center justify-center rounded-md text-clt-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas hover:bg-surface-selected disabled:cursor-not-allowed disabled:opacity-50 md:min-h-8 md:min-w-8 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11';

const successNotifications: Record<
  RegistrationAction,
  { title: string; description: string }
> = {
  approve: {
    title: 'Solicitação aceita',
    description: 'Usuário autorizado para acesso à plataforma...',
  },
  reject: {
    title: 'Solicitação rejeitada',
    description: 'Usuário não autorizado para acesso à plataforma...',
  },
};

type RegistrationRequestRowProps = {
  request: Dependente;
  rowIndex: number;
  pendingAction: PendingAction | null;
  onReject: () => void;
  onApprove: () => void;
};

function RegistrationBackButtonInRouter() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <button
      type='button'
      onClick={() => navigate(resolveParentPath(location.pathname))}
      aria-label='Voltar'
      title='Voltar'
      className='mt-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy bg-surface text-clt-2 hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
    >
      <ArrowLeft aria-hidden='true' className='h-5 w-5' />
    </button>
  );
}

function RegistrationBackButton() {
  const hasRouter = useInRouterContext();

  if (hasRouter) return <RegistrationBackButtonInRouter />;

  return (
    <button
      type='button'
      aria-label='Voltar'
      title='Voltar'
      className='mt-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy bg-surface text-clt-2 hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
    >
      <ArrowLeft aria-hidden='true' className='h-5 w-5' />
    </button>
  );
}

function RegistrationRequestRow({
  request,
  rowIndex,
  pendingAction,
  onReject,
  onApprove,
}: RegistrationRequestRowProps) {
  const isRejecting =
    pendingAction?.id === request.id && pendingAction.action === 'reject';
  const isApproving =
    pendingAction?.id === request.id && pendingAction.action === 'approve';
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-surface' : 'bg-surface-muted';

  return (
    <ResponsiveRecord className={`${backgroundColor} hover:bg-cl-table`}>
      <ResponsiveCell columnKey='date'>
        {formatCivilDate(request.dataIngresso)}
      </ResponsiveCell>
      <ResponsiveCell columnKey='name'>{request.nomeCompleto}</ResponsiveCell>
      <ResponsiveCell columnKey='email'>{request.email}</ResponsiveCell>
      <ResponsiveCell columnKey='institution'>
        {displayUserValue(request.instituicao)}
      </ResponsiveCell>
      <ResponsiveCell columnKey='actions'>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <button
            type='button'
            aria-label={`Recusar ${request.nomeCompleto}`}
            onClick={onReject}
            disabled={isRejecting}
            className={actionButtonClassName}
          >
            <span aria-hidden='true'>
              <SquareX
                className='text-danger'
                width={20}
                height={20}
                stroke='currentColor'
              />
            </span>
          </button>
          <button
            type='button'
            aria-label={`Aprovar ${request.nomeCompleto}`}
            onClick={onApprove}
            disabled={isApproving}
            className={actionButtonClassName}
          >
            <span aria-hidden='true'>
              <SquareCheck
                className='text-primaryMy'
                width={20}
                height={20}
                stroke='currentColor'
              />
            </span>
          </button>
        </div>
      </ResponsiveCell>
    </ResponsiveRecord>
  );
}

function RegistrationRequest() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const id = Cookie.get('rankID')!;
  const [approval, setApproval] = useState<Dependente[]>([]);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  const loadApproval = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await getDependentesForApproval(id);
      setApproval(response);
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadApproval();
  }, [loadApproval]);

  const handleAction = async (
    solicitanteId: number,
    action: RegistrationAction
  ) => {
    setPendingAction({ id: solicitanteId, action });
    const mutation =
      action === 'approve' ? approveDependente : rejectDependente;
    const operationId =
      action === 'approve'
        ? OPERATION_IDS.approveDependent
        : OPERATION_IDS.rejectDependent;

    try {
      await mutation(solicitanteId);
      toast(successNotifications[action]);
      await loadApproval();
    } catch (error) {
      notifyError(error, operationId);
    } finally {
      setPendingAction(null);
    }
  };
  const filteredUsers = approval.filter((user) =>
    user.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();
  // Cálculo das páginas
  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main
      id='main-content'
      aria-busy={isLoading || pendingAction !== null}
      className='min-h-svh bg-canvas text-clt-2'
    >
      {isLoading ? (
        <div
          role='status'
          className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'
        >
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : loadError ? (
        <div className='flex min-h-svh w-full flex-col items-center justify-center gap-3 bg-canvas px-4 py-8'>
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.dependentsForApproval}
            onRetry={() => void loadApproval()}
          />
          <RegistrationBackButton />
        </div>
      ) : (
        <div className='mx-auto flex min-h-svh w-full max-w-7xl flex-col overflow-y-auto bg-canvas px-4 pb-12 sm:px-6 lg:px-8'>
          <div className='flex min-w-0 flex-wrap items-center justify-between gap-4 pt-8'>
            <h1 className='min-w-0 [overflow-wrap:anywhere] uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Solicitações de Cadastro
            </h1>
            <div className='min-w-0 flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>

          <div className='flex min-h-28 w-full items-stretch justify-start pt-8'>
            <FollowUpCard
              title='Mentores'
              number={approval.length}
              icon={<UserIcon />}
            />
          </div>

          <section
            aria-label='Solicitações de cadastro'
            className='mt-8 mb-4 flex min-h-96 w-full min-w-0 flex-col items-center rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'
          >
            <div className='flex w-full flex-col-reverse items-stretch justify-between gap-4 lg:flex-row lg:items-center'>
              <div className='flex w-full min-w-0 items-start justify-start gap-2 lg:w-1/2'>
                <div className='flex w-auto items-center justify-evenly'>
                  <TopDown
                    onClick={() => toggleSortOrder(!isAscending)}
                    top={isAscending}
                  />
                </div>
                <div className='flex w-full items-center justify-evenly'>
                  <SearchInput
                    name='search'
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    value={searchTerm}
                  />
                </div>
              </div>
            </div>

            <div className='mt-4 w-full min-w-0'>
              <ResponsiveTable
                label='Solicitações de cadastro'
                columns={requestColumns}
              >
                <HeaderTable />
                <div className='w-full items-center flex flex-col justify-center min-h-72'>
                  <div className='w-full'>
                    {currentData.length === 0 ? (
                      <div
                        role='status'
                        className='flex min-w-0 flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'
                      >
                        <p className='text-lg text-center'>
                          {approval.length === 0
                            ? 'Nenhuma solicitação de cadastro pendente.'
                            : 'Nenhuma solicitação encontrada para os filtros aplicados.'}
                        </p>
                        {approval.length === 0 && (
                          <p className='text-center text-sm text-clt-1'>
                            As solicitações de cadastro aparecerão aqui quando
                            usuários solicitarem acesso.
                          </p>
                        )}
                      </div>
                    ) : (
                      currentData.map((rowData, index) => (
                        <RegistrationRequestRow
                          key={rowData.id}
                          request={rowData}
                          rowIndex={index}
                          pendingAction={pendingAction}
                          onReject={() => {
                            void handleAction(rowData.id, 'reject');
                          }}
                          onApprove={() => {
                            void handleAction(rowData.id, 'approve');
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              </ResponsiveTable>
              {currentData.length > 0 && approval.length > 0 && (
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
          </section>
        </div>
      )}
    </main>
  );
}

export default RegistrationRequest;
