import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsButtons } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { useLocation } from 'react-router-dom';
import { getDependentesID } from '@/integration/Class';
import { getUserById } from '@/integration/Users';
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
export interface IResponsible {
  id: number;
  nomeCompleto: string;
  email: string;
  senhaHash: string;
  telefone: string;
  dataIngresso: string; // Formato ISO
  nivelUsuario: string;
  tipoUsuario: string;
  status: string;
  emprestimosSolicitados: unknown; // Ajuste se necessário, pois não há exemplo de dados
  emprestimosAprovados: unknown; // Ajuste se necessário
  responsavelId: number | null;
  responsavel: IResponsible | null; // Recursivamente permite responsáveis aninhados
  dependentes: (IResponsible | null)[]; // Array de dependentes, pode conter `null`
}

// Interface para o usuário principal
export interface IUser {
  instituicao: string;
  cidade: string;
  curso: string;
  id: number;
  nomeCompleto: string;
  email: string;
  senhaHash: string;
  telefone: string;
  dataIngresso: string; // Formato ISO
  nivelUsuario: string;
  tipoUsuario: string;
  status: string;
  emprestimosSolicitados: unknown; // Ajuste se necessário
  emprestimosAprovados: unknown; // Ajuste se necessário
  responsavelId: number | null;
  responsavel: IResponsible | null; // Referência ao responsável
  dependentes: unknown[]; // Pode ser ajustado para incluir uma interface se necessário
}

// aqui virá a listagem dos integrantes da turma
function ViewClass() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const location = useLocation();
  const id = location.state?.id; // Recupera o ID passado via state
  const [dependentes, setDependentes] = useState<IUsuario[]>([]);
  const [user, setUser] = useState<IUser>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getDependentesID(id);
        const responseUser = await getUserById({ id });
        setDependentes(response);
        setUser(responseUser);
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
  }, [id]);

  console.log(dependentes);
  const filteredUsers = dependentes.filter((user) =>
    user.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  // Cálculo das páginas
  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const infoItems = user
    ? [
        { title: 'Nome', value: user?.nomeCompleto, width: '50%' },
        {
          title: 'Email',
          value: user?.email,
          width: '30%',
        },
        {
          title: 'Instituição',
          value: user?.instituicao ? user.instituicao : 'Não Corresponde',
          width: '20%',
        },
      ]
    : [];
  const infoItems5 = user
    ? [{ title: 'Status', value: user?.status, width: '100%' }]
    : [];
  const infoItems3 = user
    ? [{ title: 'Número para Contato', value: user?.telefone, width: '100%' }]
    : [];
  const infoItems4 = [
    {
      title: 'Data de Ingresso',
      value: formatDateTime(user?.dataIngresso),
      width: '100%',
    },
  ];
  const infoItems2 = [
    {
      title: 'Curso',
      value: user?.curso ? user.curso : 'Não Corresponde',
      width: '100%',
    },
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
      ) : user && dependentes ? (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Visualização de Turmas
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <InfoContainer items={infoItems} />
            <div className='w-full flex gap-x-8 mt-5'>
              <InfoContainer items={infoItems2} />
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
              <InfoContainer items={infoItems5} />
            </div>
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
                <div className='w-1/2 flex border border-borderMy rounded-sm items-center justify-between px-4 font-inter-medium text-clt-2 text-sm'>
                  <p>TOTAL:</p>
                  <p>{currentData.length}</p>
                </div>
              </div>
            </div>
            <HeaderTable columns={columnsButtons} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.map((rowData, index) => (
                  <ClickableItemTable
                    key={index}
                    data={[
                      rowData.nomeCompleto,
                      rowData.email,
                      rowData.instituicao,
                      rowData.curso,
                    ]}
                    rowIndex={index}
                    columnWidths={columnsButtons.map((column) => column.width)}
                    id={rowData.id}
                    destinationRoute='/admin/view-class-mentor'
                  />
                ))}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={currentData.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>Error</div>
      )}
    </>
  );
}

export default ViewClass;
