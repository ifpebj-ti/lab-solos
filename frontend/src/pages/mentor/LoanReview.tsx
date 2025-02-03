import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { Link } from 'react-router-dom';
import HeaderTable from '@/components/global/table/Header';
import {
  columnsEstudantesSelected,
  columnsItensSelected,
  estudantesSelected,
  itensSelected,
} from '@/mocks/Unidades';
import ItemTable from '@/components/global/table/Item';
import { useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';

function LoanReview() {
  const isLoading = false;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers = itensSelected.filter((item) =>
    item[1].toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  const [searchTerm2, setSearchTerm2] = useState('');
  const [isAscending2, setIsAscending2] = useState(true); // Novo estado para a ordem
  const toggleSortOrder2 = (ascending2: boolean) => {
    setIsAscending2(ascending2);
  };
  const filteredUsers2 = estudantesSelected.filter((item) =>
    item[1].toLowerCase().includes(searchTerm2.toLowerCase())
  );
  const sortedUsers2 = isAscending2
    ? [...filteredUsers2]
    : [...filteredUsers2].reverse();
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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Revisão de Empréstimo
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Produtos Selecionados
              </p>
            </div>
            <div className='flex flex-col items-center justify-center w-full px-4'>
              <div className='flex items-center justify-start gap-x-7 mt-5 w-full'>
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
              <HeaderTable columns={columnsItensSelected} />
              <div className='w-full items-center flex flex-col min-h-40'>
                {sortedUsers.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  sortedUsers.map((rowData, index) => (
                    <ItemTable
                      key={index}
                      data={rowData}
                      rowIndex={index}
                      columnWidths={columnsItensSelected.map(
                        (column) => column.width
                      )}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Mentorados Selecionados
              </p>
            </div>
            <div className='flex flex-col items-center justify-center w-full px-4'>
              <div className='flex items-center justify-start gap-x-7 mt-5 w-full'>
                <div className='w-[40%]'>
                  <SearchInput
                    name='search'
                    onChange={(e) => setSearchTerm2(e.target.value)} // Atualiza o estado 'searchTerm'
                    value={searchTerm2}
                  />
                </div>
                <TopDown
                  onClick={() => toggleSortOrder2(!isAscending2)}
                  top={isAscending2}
                />
              </div>
              <HeaderTable columns={columnsEstudantesSelected} />
              <div className='w-full items-center flex flex-col min-h-40'>
                {sortedUsers2.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  sortedUsers2.map((rowData, index) => (
                    <ItemTable
                      key={index}
                      data={rowData}
                      rowIndex={index}
                      columnWidths={columnsEstudantesSelected.map(
                        (column) => column.width
                      )}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          <div className='flex items-center justify-end w-11/12 mt-7 mb-8'>
            <Link
              to={'/loan/history'}
              className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 w-96 rounded-sm hover:bg-opacity-90 flex items-center justify-center'
            >
              Solicitar Empréstimo
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default LoanReview;
