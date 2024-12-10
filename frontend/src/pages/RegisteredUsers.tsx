import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import { Link } from 'react-router-dom';
import FollowUpCard from '@/components/screens/FollowUp';
import UsersIcon from '../../public/icons/UsersIcon';
import UserIcon from '../../public/icons/UserIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import { getRegisteredUsers } from '@/integration/Users';
import ItemTable from '@/components/global/table/Item';
import { formatDate } from '../function/date';
import { ArrowLeft } from 'lucide-react';

interface RegisteredUser {
  nivelUsuario: string;
  dataIngresso: string;
  nomeCompleto: string;
  tipoUsuario: string;
  status: string;
}

function RegisteredUsers() {
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      try {
        const processedRegisteredUsers = await getRegisteredUsers();
        setRegisteredUsers(processedRegisteredUsers);
      } catch (error) {
        console.error('Erro ao buscar usuários', error);
        setRegisteredUsers([]);
      } finally {
        setIsLoading(false); // Stop loading after fetch (success or failure)
      }
    };
    fetchRegisteredUsers();
  }, []);

  const headerTable = [
    { value: 'Data de Ingresso', width: '25%' },
    { value: 'Nome', width: '45%' },
    { value: 'Tipo de Usuário', width: '15%' },
    { value: 'Status', width: '15%' },
  ];

  const options = [
    { value: 'todos', label: 'Todos' }, // Para exibir todos os usuários por padrão
    { value: '0', label: 'Administradores' },
    { value: '1', label: 'Mentores' },
    { value: '2', label: 'Mentorandos' },
    { value: '3', label: 'Outro Tipo' },
  ];

  const filteredUsers = registeredUsers.filter(
    (user) =>
      (value === 'todos' || user.nivelUsuario.toString() === value) &&
      user.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase())
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
  const getUserCountText = (userType: string) => {
    const count = registeredUsers.filter(
      (user) => user.nivelUsuario == userType
    ).length;
    return `${count}`;
  };

  return (
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : registeredUsers.length != 0 ? (
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
            <FollowUpCard
              title='Administradores'
              number={getUserCountText('0')}
              icon={<UserIcon />}
            />
            <FollowUpCard
              title='Mentores'
              number={getUserCountText('1')}
              icon={<UserIcon />}
            />
            <FollowUpCard
              title='Mentorandos'
              number={getUserCountText('2')}
              icon={<UsersIcon />}
            />
          </div>
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-2'>
              <div className='w-2/4'>
                <SearchInput
                  name='search'
                  onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
                  value={searchTerm}
                />
              </div>
              <div className='w-2/4 flex justify-between'>
                <div className='w-1/2 flex items-center justify-evenly'>
                  <TopDown
                    onClick={() => toggleSortOrder(!isAscending)}
                    top={isAscending}
                  />
                </div>
                <div className='w-1/2 -mt-4'>
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
            </div>
            <HeaderTable columns={headerTable} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  currentData.map((rowData, index) => (
                    <ItemTable
                      key={index}
                      data={[
                        formatDate(rowData?.dataIngresso),
                        rowData?.nomeCompleto || 'Nome não disponível',
                        rowData.nivelUsuario,
                        rowData?.status || 'Status não disponível',
                      ]}
                      rowIndex={index}
                      columnWidths={headerTable.map((column) => column.width)}
                    />
                  ))
                )}
              </div>
              <Pagination
                totalItems={registeredUsers.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-center items-center flex-col overflow-y-auto bg-backgroundMy font-inter-regular text-lg'>
          <p className=''>Erro durante requisição.</p>
          <Link
            to={'/'}
            className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
          >
            <ArrowLeft className='mt-[2px]' />
            Voltar
          </Link>
        </div>
      )}
    </>
  );
}

export default RegisteredUsers;