import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
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
import ErrorFeedback from '@/components/global/ErrorFeedback';
import BackLink from '@/components/global/BackLink';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import {
  buildDetailUrl,
  readIdFromLocation,
} from '@/navigation/profileNavigation';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';

const mentorClassColumns: readonly ResponsiveColumn[] = [
  { key: 'name', label: 'Nome', weight: 30 },
  { key: 'email', label: 'Email', weight: 30 },
  { key: 'institution', label: 'Instituição', weight: 22 },
  { key: 'course', label: 'Curso', weight: 18 },
];

// aqui virá a listagem dos integrantes da turma
function ViewClassMentor() {
  const [isLoading, setIsLoading] = useState(false);
  const [dependentsError, setDependentsError] = useState<unknown>();
  const [retryToken, setRetryToken] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const itemsPerPage = 7;
  const location = useLocation();
  const idResolution = readIdFromLocation(location);
  const hasValidQueryId =
    idResolution.source === 'query' && idResolution.id !== null;
  const hasLegacyId =
    idResolution.source === 'state' && idResolution.id !== null;
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [user, setUser] = useState<Academico>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  useEffect(() => {
    if (!hasLegacyId || idResolution.id === null) return;

    navigate(
      buildDetailUrl(`${location.pathname}${location.search}`, idResolution.id),
      { replace: true, state: null }
    );
  }, [hasLegacyId, idResolution.id, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!hasValidQueryId || idResolution.id === null) {
      setIsLoading(false);
      return;
    }

    const classId = idResolution.id;
    setDependentsError(undefined);
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getDependentesID(String(classId));
        const responseUser = await getUserById({ id: classId });
        const academicUser = academicoSchema.safeParse(responseUser);
        setDependentes(response);
        setUser(academicUser.success ? academicUser.data : undefined);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setDependentsError(error);
        setDependentes([]);
        setUser(undefined);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, [hasValidQueryId, idResolution.id, retryToken]);

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
    if (idResolution.id === null) return;
    navigate(buildDetailUrl('/admin/view-history-class-by-id', idResolution.id));
  };
  return (
    <main aria-busy={isLoading || hasLegacyId} className='min-h-svh bg-canvas text-clt-2'>
      {hasLegacyId ? (
        <div role='status' className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'>
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
          <BackLink pathname='/admin/view-class-mentor' />
        </div>
      ) : !hasValidQueryId ? (
        <div className='flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas p-6'>
          <p>Selecione um registro para consultar</p>
          <BackLink pathname='/admin/view-class-mentor' />
        </div>
      ) : isLoading ? (
        <div role='status' className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'>
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : dependentsError ? (
        <div className='flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas p-6'>
          <ErrorFeedback
            error={dependentsError}
            operationId={OPERATION_IDS.dependentsById}
            onRetry={() => setRetryToken((token) => token + 1)}
            onNavigate={() => navigate('/admin/users')}
          />
          <BackLink pathname='/admin/view-class-mentor' />
        </div>
      ) : user && dependentes ? (
        <div className='mx-auto flex min-h-svh w-full max-w-7xl flex-col overflow-y-auto bg-canvas px-4 pb-12 sm:px-6 lg:px-8'>
          <div className='flex min-w-0 flex-wrap items-center justify-between gap-4 pt-8'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Visualização de Turmas
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <button
                onClick={handleClick}
                className='flex min-h-11 items-center rounded-md border border-borderMy bg-surface px-4 text-sm font-inter-medium uppercase text-clt-2 hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
              >
                Empréstimos da Turma
              </button>
              <OpenSearch />
            </div>
          </div>
          <div className='mt-8 w-full min-w-0'>
            <InfoContainer items={infoItems} />
            <div className='mt-5 flex w-full min-w-0 flex-wrap gap-3'>
              <InfoContainer items={infoItems2} />
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
              <InfoContainer items={infoItems5} />
            </div>
          </div>
          <section aria-label='Mentorados da turma' className='mt-8 mb-4 flex min-h-96 w-full min-w-0 flex-col items-center rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'>
            <div className='w-full min-w-0 flex flex-wrap justify-between items-center gap-3 mt-2'>
              <div className='w-full min-w-0 md:w-2/4'>
                <SearchInput
                  name='search'
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  value={searchTerm}
                />
              </div>
              <div className='w-full min-w-0 md:w-2/4 flex justify-between'>
                <div className='w-1/2 flex items-center justify-evenly'>
                  <TopDown
                    onClick={() => toggleSortOrder(!isAscending)}
                    top={isAscending}
                  />
                </div>
                <div className='flex w-1/2 items-center justify-between rounded-md border border-borderMy bg-surface-muted px-4 font-inter-medium text-sm text-clt-2'>
                  <p>TOTAL:</p>
                  <p>{currentData.length}</p>
                </div>
              </div>
            </div>
            <ResponsiveTable label='Mentorados da turma' columns={mentorClassColumns}>
              <HeaderTable />
              <div className='flex min-h-72 w-full flex-col items-center justify-center'>
              <div className='w-full min-w-0'>
                {currentData.length === 0 ? (
                  <div className='flex flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'>
                    <div aria-hidden='true' className='h-1 w-12 rounded-full bg-borderMy' />
                    <p className='text-lg text-center'>
                      {sortedUsers.length === 0
                        ? 'Nenhum mentorado encontrado nesta turma.'
                        : 'Nenhum mentorado encontrado para os filtros aplicados.'}
                    </p>
                    {sortedUsers.length === 0 && (
                      <p className='text-center text-sm text-clt-1'>
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
            </ResponsiveTable>
          </section>
        </div>
      ) : (
        <div className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 py-8'>
          <p className='text-center text-clt-1'>Não foi possível carregar a turma selecionada.</p>
          <BackLink pathname='/admin/view-class-mentor' />
        </div>
      )}
    </main>
  );
}

export default ViewClassMentor;
