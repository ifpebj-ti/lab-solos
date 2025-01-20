import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { columnsHistories, registrosHistories } from '@/mocks/Unidades';
import ItemTable from '@/components/global/table/Item';
import { useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../public/icons/LayersIcon';
import Pagination from '@/components/global/table/Pagination';

function MyClass() {
  const isLoading = false;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers = registrosHistories.filter((item) => {
    const matchesText = item[0]
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      value === 'todos' || item[4].toLowerCase() === value.toLowerCase();
    return matchesText && matchesStatus;
  });
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const getUserCountText = (userType: string) => {
    const count = registrosHistories.filter(
      (item) => item[4] == userType
    ).length;
    return `${count}`;
  };
  const options = [
    { value: 'todos', label: 'Todos' }, // Para exibir todos os usuários por padrão
    { value: 'devolvido', label: 'Devolvido' },
    { value: 'não devolvido', label: 'Não devolvido' },
  ];

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
              number={getUserCountText('devolvido')}
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
                <div className='w-[30%] -mt-4'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => {
                      setValue(value);
                      setCurrentPage(1); // Reinicia a paginação ao alterar o filtro
                    }}
                    value={value}
                  />
                </div>
              </div>
              <HeaderTable columns={columnsHistories} />
              <div className='w-full items-center flex flex-col min-h-72'>
                {currentData.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  currentData.map((rowData, index) => (
                    <ItemTable
                      key={index}
                      data={rowData}
                      rowIndex={index}
                      columnWidths={columnsHistories.map(
                        (column) => column.width
                      )}
                    />
                  ))
                )}
              </div>
              <div className='mb-4'>
                <Pagination
                  totalItems={filteredUsers.length}
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
