import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { useNavigate } from 'react-router-dom';
import FollowUpCard from '@/components/screens/FollowUp';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '../../function/date';
import { Check, ShieldAlert, Timer } from 'lucide-react';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import { getAllLoans } from '@/integration/Loans';
import ButtonLinkNotify from '@/components/screens/ButtonLinkNotify';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import type { Emprestimo } from '@/contracts/loan';
import type { Usuario } from '@/contracts/user';

const allLoanColumns: readonly ResponsiveColumn[] = [
  { key: 'date', label: 'Data de Solicitação', weight: 20 },
  { key: 'requester', label: 'Solicitante', weight: 25 },
  { key: 'owner', label: 'Responsável', weight: 25 },
  { key: 'items', label: 'Itens Utilizados', weight: 15 },
  { key: 'status', label: 'Status', weight: 15 },
];

const userName = (user: Usuario | null | undefined) =>
  user?.nomeCompleto || 'Nome não disponível';

function AllLoans() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [loan, setLoan] = useState<Emprestimo[] | null>(null);
  const [loanNotify, setLoanNotify] = useState<Emprestimo[]>([]);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllLoans = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await getAllLoans();
      const filteredLoans = response.filter(
        (loan: { status: string }) => loan.status === 'Pendente'
      );

      setLoan(response);
      setLoanNotify(filteredLoans);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllLoans();
  }, [fetchAllLoans]);


  const options = [
    { value: 'todos', label: 'Todos' }, // Para exibir todos os usuários por padrão
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Rejeitado', label: 'Rejeitado' },
  ];

  const loans = loan ?? [];
  const filteredUsers = loans.filter(
    (user) =>
      (value === 'todos' || user.status.toString() === value) &&
      user.status.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const getUserCountText = (statusLoan: string) => {
    const count = loans.filter((user) => user.status == statusLoan).length;
    return `${count}`;
  };
  return (
    <>
      {isLoading && loan === null ? (
        <div
          role='status'
          className='flex min-h-svh w-full items-center justify-center gap-x-3 bg-canvas font-inter-medium text-clt-2'
        >
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : loan === null ? (
        <main className='flex min-h-svh w-full items-center justify-center bg-canvas p-6 text-clt-2'>
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.allLoans}
            onRetry={fetchAllLoans}
            onNavigate={() => navigate('/admin')}
          />
        </main>
      ) : (
        <main className='mx-auto flex min-h-svh w-full max-w-7xl min-w-0 flex-col overflow-y-auto bg-canvas px-4 pb-12 text-clt-2 sm:px-6 lg:px-8'>
          {loadError !== null && (
            <div className='w-11/12 mt-6'>
              <ErrorFeedback
                error={loadError}
                operationId={OPERATION_IDS.allLoans}
                onRetry={fetchAllLoans}
                onNavigate={() => navigate('/admin')}
              />
            </div>
          )}
          <div className='flex min-w-0 flex-col items-start justify-between gap-5 pt-8 md:flex-row md:items-center'>
            <div>
              <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
                Histórico de Empréstimos
              </h1>
            </div>
            <div className='flex items-center justify-between gap-x-4'>
              <ButtonLinkNotify
                text='Solicitações de Empréstimo'
                notify={loanNotify.length != 0 ? true : false}
                quant={loanNotify.length}
                // link='/admin/loans-request'
              />
              <OpenSearch />
            </div>
          </div>

          <div className='mt-7 flex min-w-0 flex-wrap items-center justify-center gap-4'>
            <FollowUpCard
              title='Aprovados'
              number={getUserCountText('Aprovado')}
              icon={<Check className='text-clt-1' width={20} />}
            />
            <FollowUpCard
              title='Pendentes'
              number={getUserCountText('Pendente')}
              icon={<Timer className='text-clt-1' width={20} />}
            />
            <FollowUpCard
              title='Rejeitados'
              number={getUserCountText('Rejeitado')}
              icon={<ShieldAlert className='text-clt-1' width={20} />}
            />
          </div>

          <section aria-label='Todos os empréstimos' className='mt-10 mb-11 flex min-h-96 min-w-0 flex-col items-center rounded-xl border border-borderMy bg-surface p-4 shadow-sm'>
            <div className='w-full min-w-0 flex flex-col-reverse lg:flex-row justify-between items-center mt-2 gap-4'>
              <div className='w-full min-w-0 lg:w-1/2 h-9 flex justify-start items-start gap-2'>
                <div className='w-auto flex items-center justify-evenly'>
                  <TopDown
                    onClick={() => toggleSortOrder(!isAscending)}
                    top={isAscending}
                  />
                </div>
                <div className='w-full flex items-center justify-evenly'>
                  <SearchInput
                    name='search'
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    value={searchTerm}
                  />
                </div>
              </div>
              <div className='w-full min-w-0 lg:w-2/4 flex justify-end items-center'>
                <div className='w-full min-w-0 lg:w-1/2 -mt-2 lg:-mt-4'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => {
                      setValue(value);
                      setCurrentPage(1);
                    }}
                    value={value}
                  />
                </div>
              </div>
            </div>

            {/* 🔹 Container com scroll horizontal */}
            <div className='w-full min-w-0 mt-4'>
              <ResponsiveTable label='Todos os empréstimos' columns={allLoanColumns}>
                <HeaderTable />
                <div className='w-full items-center flex flex-col justify-center min-h-72'>
                  <div className='w-full min-w-0'>
                    {currentData.length === 0 ? (
                      <div className='flex flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'>
                        <div aria-hidden='true' className='h-12 w-12 rounded-full border-4 border-borderMy' />
                        <p className='text-lg text-center'>
                          {loans.length === 0
                            ? 'Nenhum empréstimo registrado no sistema.'
                            : 'Nenhum empréstimo encontrado para os filtros aplicados.'}
                        </p>
                        {loans.length === 0 && (
                          <p className='text-center text-sm text-clt-1'>
                            Os empréstimos aparecerão aqui quando usuários
                            realizarem solicitações.
                          </p>
                        )}
                      </div>
                    ) : (
                      currentData.map((rowData, index) => (
                        <ClickableItemTable
                          key={index}
                          data={[
                            formatDate(rowData?.dataRealizacao),
                            userName(rowData?.solicitante),
                            userName(rowData?.aprovador),
                            String(
                              rowData?.produtos.length ||
                              'Quantidade não disponível'
                            ),
                            rowData?.status || 'Status não disponível',
                          ]}
                          rowIndex={index}
                          destinationRoute={'/admin/history/loan'}
                          id={rowData.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              </ResponsiveTable>
            </div>
            {/* Componente de Paginação - só aparece quando há dados */}
            {currentData.length > 0 && loans.length > 0 && (
              <div className='mt-auto'>
                <Pagination
                  totalItems={sortedUsers.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </section>
        </main>
      )}
    </>
  );
}

export default AllLoans;
