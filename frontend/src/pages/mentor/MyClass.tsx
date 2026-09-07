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
import { Link } from 'react-router-dom';
import type { Dependente } from '@/contracts/user';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';

const myClassColumns: readonly ResponsiveColumn[] = [
  { key: 'name', label: 'Nome', weight: 22 },
  { key: 'email', label: 'Email', weight: 22 },
  { key: 'date', label: 'Data Ingresso', weight: 15 },
  { key: 'course', label: 'Curso', weight: 16 },
  { key: 'institution', label: 'Instituição', weight: 15 },
  { key: 'status', label: 'Status', weight: 10 },
];

function MyClass() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [dependentes, setDependentes] = useState<Dependente[]>([]);

  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
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
        setDependentes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, []);

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
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full min-w-0 md:w-[calc(100vw-var(--sidebar-width))] md:max-w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Minha Turma
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <Link
                to={'/mentor/my-class/disabled'}
                className='px-5 h-11 flex items-center justify-center rounded-md border border-borderMy font-inter-regular'
              >
                Mentorados desativados
              </Link>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-w-0 min-h-32 mt-7 flex flex-wrap items-center gap-4'>
            <FollowUpCard
              title='Mentorados'
              number={String(dependentes?.length)}
              icon={<LayersIcon />}
            />
          </div>
          <div className='w-11/12 min-w-0 min-h-32 mt-8 rounded-md border border-borderMy flex flex-col'>
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
              <ResponsiveTable label='Minha turma' columns={myClassColumns}>
                <HeaderTable />
              <div className='w-full min-w-0 items-center flex flex-col min-h-72'>
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
              <div className='mb-4'>
                <Pagination
                  totalItems={currentData.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MyClass;
