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
import { formatDate } from '../function/date';
import { ArrowLeft, FileText } from 'lucide-react';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import ButtonLinkNotify from '@/components/screens/ButtonLinkNotify';
import { IUsuario } from './admin/Home';
import { getDependentesForApproval } from '@/integration/Class';
import Cookie from 'js-cookie';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { MyDocument } from '@/components/pdf/MyDocument';
interface RegisteredUser {
  nivelUsuario: string;
  dataIngresso: string;
  nomeCompleto: string;
  tipoUsuario: string;
  id: string | number;
  status: string;
}

function RegisteredUsers() {
  const [isLoading, setIsLoading] = useState(true);
  const id = Cookie.get('rankID')!;
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [searchTerm, setSearchTerm] = useState('');
  const [approval, setApproval] = useState<IUsuario[]>([]);
  const columnsExport = [
    { value: 'Nome', width: '40%' },
    { value: 'Nível', width: '15%' },
    { value: 'Ingresso', width: '15%' },
    { value: 'Status', width: '15%' },
    { value: 'ID Responsável', width: '15%' },
  ];
  const columnWidthsExport = ['40%', '15%', '15%', '15%', '15%'];
  const rowData = [
    ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
    ['Mouse Logitech', '10', 'Emprestado', 'Habilitado', '22'],
    ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
    ['Mouse Logitech', '10', 'Emprestado', 'Habilitado', '22'],
    ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
    ['Mouse Logitech', '10', 'Emprestado', 'Habilitado', '22'],
    ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
  ];

  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      try {
        const response = await getDependentesForApproval(id);
        const processedRegisteredUsers = await getRegisteredUsers();
        const habilitados = processedRegisteredUsers.filter(
          (user: { status: string }) => user.status === 'Habilitado'
        );
        setRegisteredUsers(habilitados);
        setApproval(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar usuários', error);
        }
        setRegisteredUsers([]);
      } finally {
        setIsLoading(false); // Stop loading after fetch (success or failure)
      }
    };
    fetchRegisteredUsers();
  }, [id]);

  const headerTable = [
    { value: 'Data de Ingresso', width: '25%' },
    { value: 'Nome', width: '45%' },
    { value: 'Tipo de Usuário', width: '15%' },
    { value: 'Status', width: '15%' },
  ];

  const options = [
    { value: 'todos', label: 'Todos' }, // Para exibir todos os usuários por padrão
    { value: 'Administrador', label: 'Administradores' },
    { value: 'Mentor', label: 'Mentores' },
    { value: 'Mentorado', label: 'Mentorandos' },
    { value: 'Outro', label: 'Outro Tipo' },
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

  const getDestinationRoute = (userType: string) => {
    switch (userType) {
      case 'Administrador':
        return '/admin/view-class';
      case 'Mentor':
        return '/admin/view-class-mentor';
      case 'Mentorado':
        return '/admin/history/mentoring';
      default:
        return '/admin/view-class'; // Rota padrão caso o tipo de usuário não seja reconhecido
    }
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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Usuários Cadastrados
            </h1>
            <div className='flex items-center justify-between gap-x-4'>
              <ButtonLinkNotify
                text='Solicitações de Cadastro'
                notify={approval.length != 0 ? true : false}
                quant={approval.length}
                link='/admin/register-request'
              />
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
            <FollowUpCard
              title='Administradores'
              number={getUserCountText('Administrador')}
              icon={<UserIcon />}
            />
            <FollowUpCard
              title='Mentores'
              number={getUserCountText('Mentor')}
              icon={<UserIcon />}
            />
            <FollowUpCard
              title='Mentorandos'
              number={getUserCountText('Mentorado')}
              icon={<UsersIcon />}
            />
          </div>
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-3'>
              <div className='w-2/6'>
                <SearchInput
                  name='search'
                  onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
                  value={searchTerm}
                />
              </div>
              <div className='w-2/6 flex justify-evenly'>
                <TopDown
                  onClick={() => toggleSortOrder(!isAscending)}
                  top={isAscending}
                />
                <button className='border border-borderMy rounded-sm h-9 w-9 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200' >
                  <PDFDownloadLink
                    document={
                      <MyDocument
                        data={currentData.map((user) => [
                          String(user.nomeCompleto),
                          String(user.nivelUsuario),
                          String(formatDate(user.dataIngresso)),
                          String(user.status),
                          String(user.id),
                        ])}
                        title='Usuários Cadastrados'
                        columnWidths={columnWidthsExport}
                        columns={columnsExport}
                      />
                    }
                    fileName='teste.pdf'
                    className='flex items-center justify-center'
                  >
                    <button>
                      <FileText stroke='#232323' width={21} strokeWidth={1.5} />
                    </button>
                  </PDFDownloadLink>
                </button>
              </div>
              <div className='w-2/6 -mt-4'>
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
            <HeaderTable columns={headerTable} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  currentData.map((rowData, index) => (
                    <ClickableItemTable
                      key={index}
                      data={[
                        formatDate(rowData?.dataIngresso),
                        rowData?.nomeCompleto || 'Nome não disponível',
                        rowData?.nivelUsuario,
                        rowData?.status || 'Status não disponível',
                      ]}
                      rowIndex={index}
                      columnWidths={headerTable.map((column) => column.width)}
                      destinationRoute={getDestinationRoute(
                        rowData?.nivelUsuario
                      )}
                      id={rowData.id}
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
          <p>Erro durante requisição.</p>
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
