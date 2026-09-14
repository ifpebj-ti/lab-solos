import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import ItemTable from '@/components/global/table/Item';
import { useCallback, useEffect, useRef, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { getLoansById } from '@/integration/Loans';
import { useLocation, useNavigate } from 'react-router-dom';
import ItemOnly from '@/components/global/table/ItemOnly';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import BackLink from '@/components/global/BackLink';
import type { Emprestimo } from '@/contracts/loan';
import type { Usuario } from '@/contracts/user';
import { buildDetailUrl, readIdFromLocation } from '@/navigation/profileNavigation';

const studentColumns: readonly ResponsiveColumn[] = [
  { key: 'name', label: 'Nome', weight: 3 },
  { key: 'email', label: 'Email', weight: 2 },
  { key: 'phone', label: 'Telefone', weight: 2 },
];

const productColumns: readonly ResponsiveColumn[] = [
  { key: 'code', label: 'Código', weight: 2 },
  { key: 'name', label: 'Nome', weight: 4 },
  { key: 'type', label: 'Tipo', weight: 2 },
  { key: 'quantity', label: 'Quantidade', weight: 2 },
  { key: 'batch', label: 'Lote ID', weight: 2 },
];

const userName = (user: Usuario | null) => user?.nomeCompleto ?? 'Não informado';

function LoanHistoryMentee() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [loan, setLoan] = useState<Emprestimo | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const idResolution = readIdFromLocation(location);
  const requestSequence = useRef(0);
  const hasValidQueryId = idResolution.source === 'query' && idResolution.id !== null;
  const hasLegacyId = idResolution.source === 'state' && idResolution.id !== null;

  useEffect(() => {
    if (!hasLegacyId || idResolution.id === null) return;

    navigate(
      buildDetailUrl(`${location.pathname}${location.search}`, idResolution.id),
      { replace: true, state: null }
    );
  }, [hasLegacyId, idResolution.id, location.pathname, location.search, navigate]);

  const fetchGetLoan = useCallback(async () => {
    if (!hasValidQueryId || idResolution.id === null) {
      setLoan(null);
      setLoadError(null);
      return;
    }

    const sequence = ++requestSequence.current;
    setLoan(null);
    setLoadError(null);
    try {
      const response = await getLoansById({ id: idResolution.id });
      if (sequence !== requestSequence.current) return;
      setLoan(response);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setLoadError(error);
    }
  }, [hasValidQueryId, idResolution.id]);

  useEffect(() => {
    void fetchGetLoan();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchGetLoan]);

  const filteredUsers =
    loan?.produtos?.filter((item) =>
      item.produto.nomeProduto.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  if (hasLegacyId || (hasValidQueryId && loan === null && loadError === null)) {
    return (
      <div
        role='status'
        className='flex min-h-screen flex-col justify-center items-center gap-4 font-inter-medium text-clt-2 bg-backgroundMy'
      >
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando...
        <BackLink pathname='/mentee/history/loan' />
      </div>
    );
  }

  if (!hasValidQueryId || loan === null) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-backgroundMy p-6'>
        {loadError !== null ? (
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.loanById}
            onRetry={fetchGetLoan}
            onNavigate={() => navigate('/mentee/history/mentoring')}
          />
        ) : (
          <p>Selecione um registro para consultar</p>
        )}
        <BackLink pathname='/mentee/history/loan' />
      </div>
    );
  }

  return (
    <>
      <div className='w-full min-w-0 flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
        {loadError !== null && (
          <div className='w-11/12 mt-6'>
            <ErrorFeedback
              error={loadError}
              operationId={OPERATION_IDS.loanById}
              onRetry={fetchGetLoan}
              onNavigate={() => navigate('/mentee/history/mentoring')}
            />
          </div>
        )}
        <div className='w-11/12 mt-5'>
          <BackLink pathname='/mentee/history/loan' />
        </div>
        <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
          <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl md:text-3xl text-clt-2'>
            Histórico de Empréstimo - {loan.status}
          </h1>
          <div className='flex items-center justify-between gap-x-6'>
            <OpenSearch />
          </div>
        </div>
        <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
          <div className='w-full min-w-0 rounded-t-md border-b border-b-borderMy flex flex-wrap items-center justify-between gap-3 p-4'>
            <p className='font-rajdhani-medium text-clt-2 text-xl'>
              Mentorado Vinculado
            </p>
          </div>
          <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
            <ResponsiveTable label='Mentorado vinculado' columns={studentColumns}>
              <HeaderTable />
              <div className='w-full min-w-0 items-center flex flex-col min-h-14'>
                <ItemOnly
                  data={[
                    userName(loan.solicitante),
                    loan.solicitante?.email ?? 'Não informado',
                    loan.solicitante?.telefone ?? 'Não informado',
                  ]}
                />
              </div>
            </ResponsiveTable>
          </div>
        </div>
        <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
          <div className='w-full min-w-0 rounded-t-md border-b border-b-borderMy flex flex-wrap items-center justify-between gap-3 p-4'>
            <p className='font-rajdhani-medium text-clt-2 text-xl'>
              Produtos Selecionados
            </p>
          </div>
          <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
            <div className='flex min-w-0 flex-wrap items-center justify-start gap-3 mt-5 w-full'>
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
            </div>
            <ResponsiveTable label='Produtos selecionados' columns={productColumns}>
              <HeaderTable />
              <div className='w-full min-w-0 items-center flex flex-col min-h-40'>
                {sortedUsers.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  sortedUsers.map((rowData, index) => (
                    <ItemTable
                      key={`${rowData.emprestimoId}-${rowData.produto.id}`}
                      data={[
                        String(rowData.produto.id),
                        rowData.produto.nomeProduto || 'Não informado',
                        rowData.produto.tipoProduto || 'Não informado',
                        rowData.produto.quantidade
                          ? String(rowData.produto.quantidade)
                          : 'Não informado',
                        rowData.produto.lote?.codigoLote ?? 'Não informado',
                      ]}
                      rowIndex={index}
                    />
                  ))
                )}
              </div>
            </ResponsiveTable>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoanHistoryMentee;
