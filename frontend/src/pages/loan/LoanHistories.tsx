import { useCallback, useEffect, useState } from 'react';

import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import HeaderTable from '@/components/global/table/Header';
import ItemTable from '@/components/global/table/Item';
import BackLink from '@/components/global/BackLink';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import Pagination from '@/components/global/table/Pagination';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';
import { getLoansByDependentes } from '@/integration/Class';
import { formatDateTime } from '@/function/date';
import type { Emprestimo } from '@/contracts/loan';
import type { Dependente } from '@/contracts/user';
import { OPERATION_IDS } from '@/errors/errorCatalog';

const columns: readonly ResponsiveColumn[] = [
  { key: 'id', label: 'Id', weight: 1 },
  { key: 'borrower', label: 'Mentorado Vinculado', weight: 3 },
  { key: 'date', label: 'Data', weight: 2 },
  { key: 'items', label: 'Itens Utilizados', weight: 2 },
  { key: 'status', label: 'Status', weight: 2 },
];

const getRequesterName = (
  requester: Pick<Dependente, 'nomeCompleto'> | null | undefined
) => requester?.nomeCompleto ?? 'Não informado';

function LoanHistories() {
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<Emprestimo[] | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 7;

  const loadLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setLoans(await getLoansByDependentes()); }
    catch (reason) { setLoans(null); setError(reason); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadLoans(); }, [loadLoans]);

  const filtered = (loans ?? []).filter((loan) =>
     `${loan.id} ${getRequesterName(loan.solicitante)}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const current = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading && loans === null && error === null) {
    return <div role='status' className='flex min-h-screen items-center justify-center bg-backgroundMy'><LoadingIcon />Carregando...<BackLink /></div>;
  }

  return (
    <div className='w-full min-w-0 flex min-h-screen flex-col items-center overflow-y-auto bg-backgroundMy pb-9'>
      <div className='w-11/12 flex items-center justify-between mt-7'><BackLink /><h1>Histórico de Empréstimos</h1><OpenSearch /></div>
      {error !== null ? (
        <div className='w-11/12 mt-7'><ErrorFeedback error={error} operationId={OPERATION_IDS.loansByDependents} onRetry={loadLoans} /></div>
      ) : (
        <div className='w-11/12 mt-7'>
          <SearchInput name='search' onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} value={searchTerm} />
          <ResponsiveTable label='Histórico de Empréstimos' columns={columns}>
            <HeaderTable />
            <div className='w-full min-h-72'>
              {current.length === 0 ? <p className='p-10 text-center'>Nenhum dado disponível para exibição.</p> : current.map((loan, index) => (
                 <ItemTable key={loan.id} data={[String(loan.id), getRequesterName(loan.solicitante), formatDateTime(loan.dataRealizacao), String(loan.produtos.length), loan.status]} rowIndex={index} />
              ))}
            </div>
          </ResponsiveTable>
          {current.length > 0 ? <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={page} onPageChange={setPage} /> : null}
        </div>
      )}
    </div>
  );
}

export default LoanHistories;
