import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { useEffect, useRef, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../../public/icons/LayersIcon';
import Pagination from '@/components/global/table/Pagination';
import { getLoansByClass } from '@/integration/Class';
import { formatDateTime } from '@/function/date';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Emprestimo } from '@/contracts/loan';
import type { Dependente } from '@/contracts/user';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import BackLink from '@/components/global/BackLink';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { buildDetailUrl, readIdFromLocation } from '@/navigation/profileNavigation';

const classLoanColumns: readonly ResponsiveColumn[] = [
  { key: 'id', label: 'Id', weight: 1.5 },
  { key: 'borrower', label: 'Mentorado Vinculado', weight: 3 },
  { key: 'date', label: 'Data', weight: 2 },
  { key: 'items', label: 'Itens Utilizados', weight: 2 },
  { key: 'status', label: 'Status', weight: 2 },
];

const getRequesterName = (
  requester: Pick<Dependente, 'nomeCompleto'> | null | undefined
) => requester?.nomeCompleto ?? 'Não informado';

function ClassLoan() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [loans, setLoans] = useState<Emprestimo[] | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const idResolution = readIdFromLocation(location);
  const hasValidQueryId =
    idResolution.source === 'query' && idResolution.id !== null;
  const hasLegacyId =
    idResolution.source === 'state' && idResolution.id !== null;
  const requestSequence = useRef(0);
  const itemsPerPage = 7;

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
      setLoans(null);
      setLoadError(null);
      return;
    }

    const classId = idResolution.id;
    const sequence = ++requestSequence.current;
    setLoans(null);
    setLoadError(null);
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getLoansByClass({ id: classId });
        if (sequence !== requestSequence.current) return;
        setLoans(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        if (sequence === requestSequence.current) {
          setLoadError(error);
        }
      } finally {
        if (sequence === requestSequence.current) setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
    return () => {
      requestSequence.current += 1;
    };
  }, [hasValidQueryId, idResolution.id, retryToken]);

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  // Filtragem baseada no termo de busca e status
  const filteredLoans = (loans ?? []).filter((loan) => {
    const matchesText =
      loan.id.toString().includes(searchTerm) ||
       getRequesterName(loan.solicitante)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      value === 'todos' || loan.status.toLowerCase() === value.toLowerCase();
    return matchesText && matchesStatus;
  });

  // Ordenação dos empréstimos
  const sortedLoans = isAscending
    ? [...filteredLoans].sort((a, b) =>
        a.dataRealizacao.localeCompare(b.dataRealizacao)
      )
    : [...filteredLoans].sort((a, b) =>
        b.dataRealizacao.localeCompare(a.dataRealizacao)
      );

  // Dados da página atual
  const currentData = sortedLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Contagem de empréstimos por status
  const getLoanCountText = (type: string) => {
    if (!loans) return 0;

    if (type === 'devolvido') {
      return loans.filter(
        (loan) =>
          loan.dataDevolucao !== null && loan.dataDevolucao !== undefined
      ).length;
    }

    if (type === 'não devolvido') {
      return loans.filter(
        (loan) =>
          loan.dataDevolucao === null || loan.dataDevolucao === undefined
      ).length;
    }

    return 0;
  };
  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'devolvido', label: 'Devolvido' },
    { value: 'não devolvido', label: 'Não devolvido' },
  ];

  if (hasLegacyId || (hasValidQueryId && isLoading && loans === null && loadError === null)) {
    return (
      <div role='status' className='flex min-h-screen flex-col justify-center items-center gap-4 bg-backgroundMy'>
        <LoadingIcon />
        Carregando...
        <BackLink pathname='/admin/view-class-mentor' />
      </div>
    );
  }

  if (!hasValidQueryId) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-backgroundMy p-6'>
        <p>Selecione um registro para consultar</p>
        <BackLink pathname='/admin/view-class-mentor' />
      </div>
    );
  }

  if (loadError !== null) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-backgroundMy p-6'>
        <ErrorFeedback
          error={loadError}
          operationId={OPERATION_IDS.loansByClass}
          onRetry={() => setRetryToken((token) => token + 1)}
          onNavigate={() => navigate('/admin/users')}
        />
        <BackLink pathname='/admin/view-class-mentor' />
      </div>
    );
  }

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
        <div className='w-full min-w-0 md:w-[calc(100vw-var(--sidebar-width))] md:max-w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Histórico de Empréstimos
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-w-0 min-h-32 mt-7 flex flex-wrap items-center gap-4'>
            <FollowUpCard
              title='Devolvidos'
              number={getLoanCountText('devolvido')}
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Não devolvidos'
              number={getLoanCountText('não devolvido')}
              icon={<LayersIcon />}
            />
          </div>
          <div className='w-11/12 min-w-0 min-h-32 mt-8 rounded-md border border-borderMy flex flex-col'>
            <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
              <div className='flex flex-wrap items-center justify-start gap-3 mt-6 w-full min-w-0'>
                <div className='w-full min-w-0 md:w-[40%]'>
                  <SearchInput
                    name='search'
                    onChange={(e) => setSearchTerm(e.target.value)}
                    value={searchTerm}
                  />
                </div>
                <TopDown
                  onClick={() => toggleSortOrder(!isAscending)}
                  top={isAscending}
                />
                <div className='w-full min-w-0 md:w-[30%] md:-mt-4'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => {
                      setValue(value);
                      setCurrentPage(1);
                    }}
                    value={value}
                  />
                </div>
              </div>
              <ResponsiveTable label='Histórico de empréstimos da turma' columns={classLoanColumns}>
                <HeaderTable />
              <div className='w-full min-w-0 items-center flex flex-col min-h-72'>
                {currentData.length === 0 ? (
                <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  currentData.map((loan, index) => (
                    <ClickableItemTable
                      key={index}
                      data={[
                        String(loan?.id),
                         getRequesterName(loan.solicitante),
                        formatDateTime(loan?.dataRealizacao),
                         String(loan.produtos.length),
                        loan?.status,
                      ]}
                      rowIndex={index}
                      id={loan.id}
                      destinationRoute='/admin/history/loan'
                    />
                  ))
                )}
              </div>
              </ResponsiveTable>
              <div className='mb-4'>
                <Pagination
                  totalItems={filteredLoans.length}
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

export default ClassLoan;
