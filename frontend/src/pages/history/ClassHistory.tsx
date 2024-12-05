import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsButtons, dataButton } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import ItemTable from '@/components/global/table/Item';

// aqui virá as informções dos emprestimos da turma por completa
function ClassHistory() {
  const isLoading = false;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Cálculo das páginas
  const currentData = dataButton.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const infoItems = [
    { title: 'Nome', value: 'Carlos Emanuel Santos de Oliveira', width: '50%' },
    {
      title: 'Email',
      value: 'carlos.oliveira@belojardim.ifpe.edu.br',
      width: '30%',
    },
    { title: 'Instituição', value: 'IFPE', width: '20%' },
  ];
  return (
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Histórico da Turma
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <InfoContainer items={infoItems} />
          </div>
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-2'>
              <div className='w-2/4'>
                <SearchInput name='search' onChange={() => console.log('build')} value='1'  />
              </div>
              <div className='w-2/4 flex justify-between'>
                <div className='w-1/2 flex items-center justify-evenly'>
                  <TopDown onClick={() => console.log('s')} top={true} />
                  <TopDown onClick={() => console.log('s')} top={false} />
                </div>
                <div className='w-1/2 flex border border-borderMy rounded-sm items-center justify-between px-4 font-inter-medium text-clt-2 text-sm'>
                  <p>TOTAL:</p>
                  <p>{dataButton.length}</p>
                </div>
              </div>
            </div>
            <HeaderTable columns={columnsButtons} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.map((rowData, index) => (
                  <ItemTable
                    key={index}
                    data={[rowData.name, rowData.institution, rowData.code]}
                    rowIndex={index}
                    columnWidths={columnsButtons.map((column) => column.width)}
                  />
                ))}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={dataButton.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ClassHistory;
