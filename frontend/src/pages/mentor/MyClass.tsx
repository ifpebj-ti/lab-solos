import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../..//public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { columnsClass } from '@/mocks/Unidades';
import { useEffect, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../../public/icons/LayersIcon';
import Pagination from '@/components/global/table/Pagination';
import { getDependentes } from '@/integration/Class';
import { formatDateTime } from '@/function/date';
import ClickableItemTable from '@/components/global/table/ItemClickable';

interface IUsuario {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string;
  status: string;
  nivelUsuario: string;
  cidade: string;
  curso: string;
  instituicao: string;
}

function MyClass() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [dependentes, setDependentes] = useState<IUsuario[]>([]);

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
          console.error('Erro ao buscar dados de empréstimos:', error);
        }
        setDependentes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, []);

  console.log(dependentes);

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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy mb-8'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Minha Turma
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
            <FollowUpCard
              title='Mentorados'
              number={String(dependentes?.length)}
              icon={<LayersIcon />}
            />
          </div>
          <div className='w-11/12 min-h-32 mt-8 rounded-md border border-borderMy flex flex-col'>
            <div className='flex flex-col items-center justify-center w-full px-4'>
              <div className='flex items-center justify-start gap-x-7 mt-6 w-full'>
                <div className='w-[40%]'>
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
              <HeaderTable columns={columnsClass} />
              <div className='w-full items-center flex flex-col min-h-72'>
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
                        formatDateTime(rowData.dataIngresso),
                        rowData.curso,
                        rowData.instituicao,
                        rowData.status,
                      ]}
                      rowIndex={index}
                      columnWidths={columnsClass.map((column) => column.width)}
                      destinationRoute='/mentor/history/mentoring' // Ajuste conforme necessário
                      id={rowData.id}
                    />
                  ))
                )}
              </div>
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
