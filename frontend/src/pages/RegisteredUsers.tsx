import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import { Link } from 'react-router-dom';
import FollowUpCard from '@/components/screens/FollowUp';
import UsersIcon from '../../public/icons/UsersIcon';
import UserIcon from '../../public/icons/UserIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import { columnsButtons, dataButton } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useState } from 'react';
import ItemTableButton from '@/components/global/table/ItemButton';
import { ShieldCheck, Trash2 } from 'lucide-react';

function RegisteredUsers() {
  const isLoading = false;
  const [value, setValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const options = [
    { value: 'upe', label: 'UPE' },
    { value: 'ufpe', label: 'UFPE' },
    { value: 'ufrpe', label: 'UFRPE' },
    { value: 'uepb', label: 'UEPB' },
    { value: 'ufpb', label: 'UFPB' },
    { value: 'ifpe', label: 'IFPE' },
  ];

  // Cálculo das páginas
  const currentData = dataButton.slice(
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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Usuários Cadastrados
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
              <Link
                to={'/users/request'}
                className='border border-borderMy rounded-md h-11 px-4 uppercase font-inter-medium text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200 flex items-center'
              >
                Solicitações de Cadastro
              </Link>
            </div>
          </div>
          <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
            <FollowUpCard title='Mentores' number='3' icon={<UserIcon />} />
            <FollowUpCard
              title='Mentorandos'
              number='54'
              icon={<UsersIcon />}
            />
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
            <HeaderTable columns={columnsButtons} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.map((rowData, index) => (
                  <ItemTableButton
                    key={index}
                    data={[rowData.name, rowData.institution, rowData.code]}
                    rowIndex={index}
                    columnWidths={columnsButtons.map((column) => column.width)}
                    onClick1={() => console.log('bt1')}
                    onClick2={() => console.log('bt2')}
                    icon1={<Trash2 width={18} height={18} stroke='#232323' />}
                    icon2={
                      <ShieldCheck width={18} height={18} stroke='#232323' />
                    }
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

export default RegisteredUsers;
