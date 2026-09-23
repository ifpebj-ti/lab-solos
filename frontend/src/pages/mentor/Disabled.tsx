import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../..//public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { useEffect, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../../public/icons/LayersIcon';
import Pagination from '@/components/global/table/Pagination';
import { getDependentes } from '@/integration/Class';
import { displayUserValue, formatCivilDate } from '@/function/date';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import type { Dependente } from '@/contracts/user';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';
import BackLink from '@/components/global/BackLink';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';

const disabledColumns: readonly ResponsiveColumn[] = [
  { key: 'name', label: 'Nome', weight: 22 },
  { key: 'email', label: 'Email', weight: 22 },
  { key: 'date', label: 'Data Desativação', weight: 15 },
  { key: 'course', label: 'Curso', weight: 16 },
  { key: 'institution', label: 'Instituição', weight: 15 },
  { key: 'action', label: 'Ação', weight: 10 },
];

function Disabled() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loadError, setLoadError] = useState<unknown>();
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      setLoadError(undefined);
      try {
        const response = await getDependentes();
        const habilitados = response.filter(
          (user: { status: string }) => user.status === 'Habilitado'
        );
        setDependentes(habilitados);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setLoadError(error);
        setDependentes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, [retryToken]);

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers = dependentes.filter((item) => {
    const matchesText = item.nomeCompleto
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesText;
  });
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main aria-busy={isLoading} className='min-h-svh bg-canvas text-clt-2'>
      {isLoading ? (
        <div role='status' className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'>
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : loadError ? (
        <div className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 py-8'>
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.dependents}
            onRetry={() => setRetryToken((token) => token + 1)}
          />
        </div>
      ) : (
        <div className='mx-auto flex min-h-svh w-full max-w-7xl flex-col overflow-y-auto bg-canvas px-4 pb-12 sm:px-6 lg:px-8'>
          <div className='flex min-w-0 flex-wrap items-center justify-between gap-4 pt-8'>
            <BackLink />
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Minha Turma
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='flex min-h-28 w-full flex-wrap items-stretch gap-4 pt-8'>
            <FollowUpCard
              title='Mentorados'
              number={String(dependentes?.length)}
              icon={<LayersIcon />}
            />
          </div>
          <section aria-label='Mentorados desativados' className='mt-8 mb-4 flex min-h-96 w-full min-w-0 flex-col rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'>
            <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
              <div className='flex flex-wrap items-center justify-start gap-3 mt-6 w-full min-w-0'>
                <div className='w-full min-w-0 md:w-[40%]'>
                  <SearchInput
                    name='search'
                    onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
                    value={searchTerm}
                  />
                </div>
                <TopDown
                  onClick={() => toggleSortOrder(!isAscending)}
                  top={isAscending}
                />
              </div>
              <ResponsiveTable label='Mentorados desativados' columns={disabledColumns}>
                <HeaderTable />
              <div className='flex min-h-72 w-full min-w-0 flex-col items-center'>
                {currentData.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  currentData.map((rowData, index) => (
                    <ClickableItemTable
                      key={index}
                      data={[
                        rowData.nomeCompleto,
                        rowData.email,
                        formatCivilDate(rowData.dataIngresso),
                        displayUserValue(rowData.curso),
                        displayUserValue(rowData.instituicao),
                        rowData.status,
                      ]}
                      rowIndex={index}
                      destinationRoute='/mentor/history/mentoring' // Ajuste conforme necessário
                      id={rowData.id}
                    />
                  ))
                )}
              </div>
              </ResponsiveTable>
              <div className='mb-4 mt-4'>
                <Pagination
                    totalItems={sortedUsers.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Disabled;
