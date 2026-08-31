import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsButtons } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDependentesID } from '@/integration/Class';
import { getUserById } from '@/integration/Users';
import { displayUserValue, formatCivilDate } from '@/function/date';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import { academicoSchema } from '@/contracts/user';
import type { Academico, Dependente } from '@/contracts/user';

// aqui virá a listagem dos integrantes da turma
function ViewClassMentor() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const itemsPerPage = 7;
  const location = useLocation();
  const id = location.state?.id; // Recupera o ID passado via state
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [user, setUser] = useState<Academico>();
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
        const academicUser = academicoSchema.safeParse(responseUser);
        setDependentes(response);
        setUser(academicUser.success ? academicUser.data : undefined);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setDependentes([]);
        setUser(undefined);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, [id]);

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
          value: displayUserValue(user.instituicao),
          width: '20%',
        },
      ]
    : [];
  const infoItems5 = user
    ? [{ title: 'Status', value: user?.status, width: '100%' }]
    : [];
  const infoItems3 = user
    ? [
        {
          title: 'Número para Contato',
          value: displayUserValue(user.telefone),
          width: '100%',
        },
      ]
    : [];
  const infoItems4 = [
    {
      title: 'Data de Ingresso',
      value: formatCivilDate(user?.dataIngresso),
      width: '100%',
    },
  ];
  const infoItems2 = user
    ? [
        {
          title: 'Curso',
          value: displayUserValue(user.curso),
          width: '50%',
        },
        {
          title: 'Cidade',
          value: displayUserValue(user.cidade),
          width: '50%',
        },
      ]
    : [];
  const handleClick = () => {
    navigate('/admin/view-history-class-by-id', { state: { id } });
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
      ) : user && dependentes ? (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Visualização de Turmas
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <button
                onClick={handleClick}
                className='border border-borderMy rounded-md h-11 px-4 uppercase font-inter-medium text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200 flex items-center'
              >
                Empréstimos da Turma
              </button>
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
            <div className='w-full items-center flex flex-col justify-center min-h-72'>
              <div className='w-full'>
                {currentData.length === 0 ? (
                  <div className='flex flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'>
                    <div className='text-6xl text-gray-300'>👨‍🎓</div>
                    <p className='text-lg text-center'>
                      {sortedUsers.length === 0
                        ? 'Nenhum mentorado encontrado nesta turma.'
                        : 'Nenhum mentorado encontrado para os filtros aplicados.'}
                    </p>
                    {sortedUsers.length === 0 && (
                      <p className='text-sm text-gray-500 text-center'>
                        Os mentorados aparecerão aqui quando forem vinculados à
                        sua turma.
                      </p>
                    )}
                  </div>
                ) : (
                  currentData.map((rowData, index) => (
                    <ClickableItemTable
                      key={index}
                      data={[
                        rowData.nomeCompleto,
                        rowData.email,
                        displayUserValue(rowData.instituicao),
                        displayUserValue(rowData.curso),
                      ]}
                      rowIndex={index}
                      columnWidths={columnsButtons.map(
                        (column) => column.width
                      )}
                      id={rowData.id}
                      destinationRoute='/admin/history/mentoring'
                    />
                  ))
                )}
              </div>
              {/* Componente de Paginação - só aparece quando há dados */}
              {currentData.length > 0 && sortedUsers.length > 0 && (
                <div className='mt-auto'>
                  <Pagination
                    totalItems={sortedUsers.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>oq botar aqui?</div>
      )}
    </>
  );
}

export default ViewClassMentor;
