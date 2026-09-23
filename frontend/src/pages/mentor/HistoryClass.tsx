import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import HeaderTable from '@/components/global/table/Header';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import BackLink from '@/components/global/BackLink';
import Pagination from '@/components/global/table/Pagination';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';
import { getLoansByDependentes } from '@/integration/Class';
import { formatDateTime } from '@/function/date';
import type { Emprestimo } from '@/contracts/loan';
import type { Dependente } from '@/contracts/user';
import { OPERATION_IDS } from '@/errors/errorCatalog';

const columns: readonly ResponsiveColumn[] = [
  { key: 'id', label: 'Id', weight: 1.5 },
  { key: 'borrower', label: 'Mentorado Vinculado', weight: 3 },
  { key: 'date', label: 'Data', weight: 2 },
  { key: 'items', label: 'Itens Utilizados', weight: 2 },
  { key: 'status', label: 'Status', weight: 2 },
];

const getRequesterName = (
  requester: Pick<Dependente, 'nomeCompleto'> | null | undefined
) => requester?.nomeCompleto ?? 'Não informado';

function HistoryClass() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<Emprestimo[] | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 7;

  const loadLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLoans(await getLoansByDependentes());
    } catch (reason) {
      setLoans(null);
      setError(reason);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadLoans(); }, [loadLoans]);

  const filtered = (loans ?? []).filter((loan) =>
     `${loan.id} ${getRequesterName(loan.solicitante)}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const current = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading && loans === null && error === null) {
    return <main className='min-h-svh bg-canvas text-clt-2'><div role='status' className='flex min-h-svh items-center justify-center gap-3 bg-canvas'><span className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'><LoadingIcon /></span>Carregando...</div></main>;
  }

  return (
    <main className='mx-auto flex min-h-svh w-full max-w-7xl min-w-0 flex-col overflow-y-auto bg-canvas px-4 pb-12 text-clt-2 sm:px-6 lg:px-8'>
      <div className='flex flex-wrap items-center justify-between gap-4 pt-8'><BackLink /><h1 className='min-w-0 break-words font-rajdhani-medium text-2xl uppercase text-clt-2 md:text-3xl'>Histórico de Empréstimos</h1><OpenSearch /></div>
      {error !== null ? (
        <div className='mt-7'><ErrorFeedback error={error} operationId={OPERATION_IDS.loansByDependents} onRetry={loadLoans} /></div>
      ) : (
        <section aria-label='Histórico da turma' className='mt-7 rounded-xl border border-borderMy bg-surface p-4 sm:p-6'>
          <SearchInput name='search' onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} value={searchTerm} />
          <ResponsiveTable label='Histórico da turma' columns={columns}>
            <HeaderTable />
            <div className='w-full min-h-72'>
              {current.length === 0 ? <p className='p-10 text-center text-clt-1'>Nenhum empréstimo encontrado.</p> : current.map((loan, index) => (
                 <ClickableItemTable key={loan.id} data={[String(loan.id), getRequesterName(loan.solicitante), formatDateTime(loan.dataRealizacao), String(loan.produtos.length), loan.status]} rowIndex={index} id={loan.id} destinationRoute='/mentor/history/loan' />
              ))}
            </div>
          </ResponsiveTable>
          {current.length > 0 ? <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={page} onPageChange={setPage} /> : null}
        </section>
      )}
      <span className='sr-only'>{location.pathname}</span>
    </main>
  );
}

export default HistoryClass;
