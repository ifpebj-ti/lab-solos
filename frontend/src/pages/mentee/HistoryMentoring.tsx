import Cookie from 'js-cookie';
import { useCallback, useEffect, useRef, useState } from 'react';

import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import InfoContainer from '@/components/screens/InfoContainer';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import BackLink from '@/components/global/BackLink';
import { getUserById } from '@/integration/Users';
import { getLoansByUserId } from '@/integration/Loans';
import { displayUserValue, formatCivilDate, formatDateTime } from '@/function/date';
import { academicoSchema, type Academico } from '@/contracts/user';
import type { Emprestimo } from '@/contracts/loan';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';

const historyMentoringColumns: readonly ResponsiveColumn[] = [
  { key: 'id', label: 'Id', weight: 1.5 },
  { key: 'date', label: 'Data', weight: 2 },
  { key: 'items', label: 'Itens Utilizados', weight: 2 },
  { key: 'status', label: 'Status', weight: 2 },
];

function HistoryMentoring() {
  const sessionId = Cookie.get('rankID') ?? null;
  const requestSequence = useRef(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<Academico | null>(null);
  const [loans, setLoans] = useState<Emprestimo[] | null>(null);
  const [userError, setUserError] = useState<unknown | null>(null);
  const [loansError, setLoansError] = useState<unknown | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const itemsPerPage = 7;

  const loadData = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      setUser(null);
      setLoans(null);
      setUserError(null);
      setLoansError(null);
      return;
    }

    const sequence = ++requestSequence.current;
    setLoading(true);
    setUser(null);
    setLoans(null);
    setUserError(null);
    setLoansError(null);
    try {
      const response = await getUserById({ id: sessionId });
      const academicResult = academicoSchema.safeParse(response);
      if (!academicResult.success) throw new Error('Resposta de usuário inválida.');
      if (sequence !== requestSequence.current) return;
      setUser(academicResult.data);
      try {
        const loansResponse = await getLoansByUserId({ id: sessionId });
        if (sequence !== requestSequence.current) return;
        setLoans(loansResponse);
      } catch (error) {
        if (sequence === requestSequence.current) setLoansError(error);
      }
    } catch (error) {
      if (sequence === requestSequence.current) setUserError(error);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadData();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadData]);

  const sortedLoans = [...(loans ?? [])]
    .filter((loan) => loan.dataRealizacao.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((left, right) => {
      const comparison = left.dataRealizacao.localeCompare(right.dataRealizacao);
      return isAscending ? comparison : -comparison;
    });
  const currentData = sortedLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const infoItems = user
    ? [{ title: 'Nome', value: displayUserValue(user.nomeCompleto), width: '100%' }]
    : [];
  const infoItems2 = user
    ? [{ title: 'Email', value: displayUserValue(user.email), width: '100%' }]
    : [];
  const infoItems3 = user
    ? [{ title: 'Instituição', value: displayUserValue(user.instituicao), width: '100%' }]
    : [];
  const infoItems4 = user
    ? [{ title: 'Cidade', value: displayUserValue(user.cidade), width: '100%' }]
    : [];
  const infoItems5 = user
    ? [{ title: 'Número para Contato', value: displayUserValue(user.telefone), width: '100%' }]
    : [];
  const infoItems6 = user
    ? [{ title: 'Data de Ingresso', value: formatCivilDate(user.dataIngresso), width: '100%' }]
    : [];
  const infoItems7 = user
    ? [{ title: 'Curso', value: displayUserValue(user.curso), width: '100%' }]
    : [];

  if (loading && user === null && userError === null) {
    return (
      <div role='status' className='flex min-h-screen flex-col justify-center items-center gap-4 bg-backgroundMy'>
        <LoadingIcon />
        Carregando...
        <BackLink />
      </div>
    );
  }
  if (!sessionId || (user === null && userError === null)) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-backgroundMy p-6'>
        <p>Selecione um registro para consultar</p>
        <BackLink />
      </div>
    );
  }
  if (userError !== null) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-backgroundMy p-6'>
        <ErrorFeedback error={userError} operationId={OPERATION_IDS.userById} onRetry={loadData} />
        <BackLink />
      </div>
    );
  }

  return (
    <div className='w-full min-w-0 md:w-[calc(100vw-var(--sidebar-width))] md:max-w-full flex min-h-screen flex-col items-center overflow-y-auto bg-backgroundMy pb-9'>
      <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
        <BackLink />
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>Histórico de Mentorados</h1>
        <OpenSearch />
      </div>
      <div className='w-11/12 min-w-0 flex flex-wrap mt-7 gap-y-3'>
        <InfoContainer items={infoItems} />
        <InfoContainer items={infoItems2} />
        <InfoContainer items={infoItems3} />
        <InfoContainer items={infoItems4} />
        <InfoContainer items={infoItems5} />
        <InfoContainer items={infoItems6} />
        <InfoContainer items={infoItems7} />
      </div>
      <div className='bg-white shadow-sm rounded-md w-11/12 min-w-0 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
        {loansError !== null ? (
          <ErrorFeedback error={loansError} operationId={OPERATION_IDS.loansByUser} onRetry={loadData} />
        ) : (
          <>
            <div className='w-full min-w-0 flex flex-wrap justify-between items-center mt-2 gap-4'>
              <SearchInput name='search' onChange={(event) => setSearchTerm(event.target.value)} value={searchTerm} />
              <TopDown onClick={() => setIsAscending((value) => !value)} top={isAscending} />
            </div>
            <ResponsiveTable label='Histórico de mentorados' columns={historyMentoringColumns}>
              <HeaderTable />
              <div className='w-full min-w-0 flex flex-col justify-start min-h-72'>
                {loans?.length === 0 ? (
                  <div className='w-full h-40 flex flex-col items-center justify-center'>
                    <p>Você ainda não possui empréstimos registrados.</p>
                    <p>Seus empréstimos aparecerão aqui quando você realizar solicitações.</p>
                  </div>
                ) : currentData.length === 0 ? (
                  <p className='p-8 text-center'>Nenhum empréstimo encontrado para os filtros aplicados.</p>
                ) : (
                  currentData.map((rowData, index) => (
                    <ClickableItemTable
                      key={rowData.id}
                      data={[String(rowData.id), formatDateTime(rowData.dataRealizacao), String(rowData.produtos.length), rowData.status]}
                      rowIndex={index}
                      destinationRoute='/mentee/history/loan'
                      id={rowData.id}
                    />
                  ))
                )}
              </div>
            </ResponsiveTable>
            {currentData.length > 0 ? <Pagination totalItems={sortedLoans.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} /> : null}
          </>
        )}
      </div>
    </div>
  );
}

export default HistoryMentoring;
