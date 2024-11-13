import OpenSearch from '../components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import HeaderTable from '@/components/global/table/Header';
import ItemTable from '@/components/global/table/Item';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import Pagination from '../components/global/table/Pagination'; // Importa o componente Pagination
import { useState } from 'react';

function FollowUp() {
  const isLoading = false;
  const [value, setValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Colunas e dados da tabela
  const columns = [
    { value: 'Nome', width: '20%' },
    { value: 'Endereço', width: '30%' },
    { value: 'Profissão', width: '30%' },
    { value: 'Email', width: '20%' },
  ];
  const testData = [
    ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
    ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
    ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
    ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
    ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
    ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
    ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
    ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
    ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
    ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
    ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
    ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
    ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
    ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
    ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
    ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
    ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
    ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
    ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
    ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
    ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
    ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
    ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
    ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
    // Adicione mais dados conforme necessário
  ];
  const options = [
    { value: 'validade', label: 'Validade' },
    { value: 'estoque', label: 'Estoque' },
  ];

  // Cálculo das páginas
  const currentData = testData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className='w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Acompanhamento
            </h1>
            <div className='flex items-center justify-between'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
            <FollowUpCard />
            <FollowUpCard />
            <FollowUpCard />
          </div>
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-2'>
              <div className='w-2/4'>
                <SearchInput name='search' />
              </div>
              <div className='w-2/4 flex justify-between'>
                <div className='w-1/2 flex items-center justify-evenly'>
                  <TopDown onClick={() => console.log('s')} top={true} />
                  <TopDown onClick={() => console.log('s')} top={false} />
                </div>
                <div className='w-1/2 -mt-4'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => setValue(value)}
                    value={value}
                  />
                </div>
              </div>
            </div>
            <HeaderTable columns={columns} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.map((rowData, index) => (
                  <ItemTable
                    key={index}
                    data={rowData}
                    rowIndex={index}
                    columnWidths={columns.map((column) => column.width)}
                  />
                ))}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={testData.length}
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

export default FollowUp;
