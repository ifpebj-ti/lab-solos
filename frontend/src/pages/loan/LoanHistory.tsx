import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { getUnidadePlural } from '@/mocks/Unidades';
import ItemTable from '@/components/global/table/Item';
import { useCallback, useEffect, useRef, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import {
  approveLoan,
  getLoansById,
  rejectLoan,
  returnLoan,
} from '@/integration/Loans';
import { useLocation, useNavigate } from 'react-router-dom';
import ItemOnly from '@/components/global/table/ItemOnly';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import { toast } from '@/components/hooks/use-toast';
import { FileText, RefreshCw } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import BackLink from '@/components/global/BackLink';
import type { Emprestimo } from '@/contracts/loan';
import type { Usuario } from '@/contracts/user';
import {
  buildDetailUrl,
  readIdFromLocation,
  resolveParentPath,
} from '@/navigation/profileNavigation';

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

const columnsExport = [
  { value: 'ID', width: '10%' },
  { value: 'Item', width: '45%' },
  { value: 'Quantidade', width: '15%' },
  { value: 'Lote', width: '15%' },
  { value: 'Tipo', width: '15%' },
];
const columnWidthsExport = ['10%', '45%', '15%', '15%', '15%'];

const userName = (user: Usuario | null) =>
  user?.nomeCompleto ?? 'Não informado';

function LoanProductRows({ products }: { products: Emprestimo['produtos'] }) {
  if (products.length === 0) {
    return (
      <div className='flex h-40 w-full items-center justify-center font-inter-regular text-clt-1'>
        Nenhum dado disponível para exibição.
      </div>
    );
  }

  return (
    <>
      {products.map((rowData, index) => (
        <ItemTable
          key={`${rowData.emprestimoId}-${rowData.produto.id}`}
          data={[
            rowData.produto.id
              ? String(rowData.produto.id)
              : 'Não informado',
            rowData.produto.nomeProduto || 'Não informado',
            rowData.produto.tipoProduto || 'Não informado',
            rowData.quantidade
              ? rowData.produto.unidadeMedida
                ? `${rowData.quantidade} ${getUnidadePlural(
                    rowData.produto.unidadeMedida,
                    rowData.quantidade
                  )}`
                : `${rowData.quantidade} (unidade não informada)`
              : 'Não informado',
            rowData.produto.lote?.codigoLote || 'Não informado',
          ]}
          rowIndex={index}
        />
      ))}
    </>
  );
}

function LoanReturnAction({
  loan,
  pendingAction,
  onReturn,
}: {
  loan: Emprestimo;
  pendingAction: 'approve' | 'reject' | 'return' | null;
  onReturn: () => void;
}) {
  if (loan.status !== 'Aprovado') return null;
  if (!loan.dataDevolucao) {
    return (
      <button
        type='button'
        onClick={onReturn}
        disabled={pendingAction === 'return'}
        className='flex h-11 items-center justify-center gap-x-3 rounded-md border border-success px-4 font-rajdhani-semibold text-xl text-success transition-colors hover:bg-surface-selected'
      >
        Registrar Devolução
        <RefreshCw className='text-success' width={20} />
      </button>
    );
  }

  return (
    <div className='flex items-center gap-x-2 text-success'>
      <RefreshCw className='text-success' width={16} />
      <span className='font-rajdhani-semibold text-lg'>Empréstimo Devolvido</span>
    </div>
  );
}

type LoanProductsSectionProps = {
  loan: Emprestimo;
  products: Emprestimo['produtos'];
  pendingAction: 'approve' | 'reject' | 'return' | null;
  onReturn: () => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  isAscending: boolean;
  onToggleSortOrder: () => void;
  isExporting: boolean;
  onExportPdf: () => void;
  onExportExcel: () => void;
};

function LoanProductsSection({
  loan,
  products,
  pendingAction,
  onReturn,
  searchTerm,
  onSearch,
  isAscending,
  onToggleSortOrder,
  isExporting,
  onExportPdf,
  onExportExcel,
}: LoanProductsSectionProps) {
  return (
    <section
      aria-label='Produtos selecionados'
      className='mt-7 flex min-h-32 w-full min-w-0 flex-col rounded-xl border border-borderMy bg-surface'
    >
      <div className='flex w-full min-w-0 flex-wrap items-center justify-between gap-3 rounded-t-md border-b border-b-borderMy p-3'>
        <p className='font-rajdhani-medium text-xl text-clt-2'>
          Produtos Selecionados
        </p>
        <LoanReturnAction
          loan={loan}
          pendingAction={pendingAction}
          onReturn={onReturn}
        />
      </div>
      <div className='flex w-full min-w-0 flex-col items-center justify-center px-4'>
        <div className='mt-5 flex w-full min-w-0 flex-wrap items-center justify-start gap-3'>
          <div className='w-full min-w-0 md:w-[40%]'>
            <SearchInput
              name='search'
              onChange={(event) => onSearch(event.target.value)}
              value={searchTerm}
            />
          </div>
          <TopDown onClick={onToggleSortOrder} top={isAscending} />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type='button'
                aria-label='Exportar empréstimo'
                className='flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy transition-colors hover:bg-surface-selected md:h-9 md:w-9'
              >
                <FileText className='text-clt-2' width={21} strokeWidth={1.5} />
              </button>
            </PopoverTrigger>
            <PopoverContent className='w-32 border border-borderMy bg-surface p-2 shadow-lg'>
              <ul className='flex w-full flex-col items-start gap-y-1'>
                <li className='flex w-full items-center rounded px-2 py-1 text-sm font-inter-regular transition-colors hover:bg-surface-selected'>
                  <button
                    type='button'
                    onClick={onExportPdf}
                    disabled={isExporting}
                    aria-busy={isExporting}
                    className='flex items-center justify-center disabled:cursor-wait disabled:opacity-60'
                  >
                    <FileText
                      width={18}
                      strokeWidth={1.5}
                      className='mr-1 mt-[2px] text-clt-2'
                    />
                    PDF
                  </button>
                </li>
                <li className='flex w-full items-center rounded px-2 py-1 text-sm font-inter-regular transition-colors hover:bg-surface-selected'>
                  <button
                    type='button'
                    aria-label='Exportar Excel'
                    aria-busy={isExporting}
                    disabled={isExporting}
                    onClick={onExportExcel}
                    className='flex w-full items-center disabled:cursor-wait disabled:opacity-60'
                  >
                    <FileText
                      width={18}
                      strokeWidth={1.5}
                      className='mr-1 mt-[2px] text-clt-2'
                    />
                    Excel
                  </button>
                </li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        <ResponsiveTable label='Produtos selecionados' columns={productColumns}>
          <HeaderTable />
          <div className='flex min-h-40 w-full min-w-0 flex-col items-center'>
            <LoanProductRows products={products} />
          </div>
        </ResponsiveTable>
      </div>
    </section>
  );
}

function LoanDecisionActions({
  loan,
  pendingAction,
  onApprove,
  onReject,
}: {
  loan: Emprestimo;
  pendingAction: 'approve' | 'reject' | 'return' | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (loan.status === 'Aprovado') return null;

  return (
    <div className='mt-6 flex h-11 w-full min-w-0 flex-wrap items-center justify-end gap-3'>
      <button
        type='button'
        onClick={onReject}
        disabled={pendingAction === 'reject'}
        className='h-11 w-28 rounded-md border border-danger font-inter-medium text-danger transition-colors hover:bg-danger hover:text-on-danger'
      >
        Rejeitar
      </button>
      <button
        type='button'
        onClick={onApprove}
        disabled={pendingAction === 'approve'}
        className='h-11 w-28 rounded-md border border-success font-inter-medium text-success transition-colors hover:bg-success hover:text-on-success'
      >
        Aceitar
      </button>
    </div>
  );
}

function useLoanDetails(id: number | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [loan, setLoan] = useState<Emprestimo | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const requestSequence = useRef(0);

  const fetchGetLoan = useCallback(async (): Promise<boolean> => {
    if (id === null) {
      setIsLoading(false);
      setLoan(null);
      setLoadError(null);
      return false;
    }

    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setLoan(null);
    setLoadError(null);
    try {
      const response = await getLoansById({ id });
      if (sequence !== requestSequence.current) return false;
      setLoan(response);
      setLoadError(null);
      return true;
    } catch (error) {
      if (sequence !== requestSequence.current) return false;
      setLoadError(error);
      return false;
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchGetLoan();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchGetLoan]);

  return { isLoading, loan, loadError, fetchGetLoan };
}

function useLoanActions(
  loan: Emprestimo | null,
  fetchGetLoan: () => Promise<boolean>
) {
  const [pendingAction, setPendingAction] = useState<
    'approve' | 'reject' | 'return' | null
  >(null);

  const runAction = async (
    action: 'approve' | 'reject' | 'return',
    mutation: (loanId: number) => Promise<unknown>,
    operation:
      | typeof OPERATION_IDS.approveLoan
      | typeof OPERATION_IDS.rejectLoan
      | typeof OPERATION_IDS.returnLoan,
    successToast: { title: string; description: string },
    refreshAfterSuccess = false
  ) => {
    if (!loan || pendingAction !== null) return;

    setPendingAction(action);
    try {
      await mutation(loan.id);
      if (refreshAfterSuccess && !(await fetchGetLoan())) return;
      toast(successToast);
    } catch (error) {
      notifyError(error, operation);
    } finally {
      setPendingAction(null);
    }
  };

  const handleApprove = () =>
    runAction('approve', approveLoan, OPERATION_IDS.approveLoan, {
      title: 'Solicitação aceita',
      description: 'Empréstimo autorizado para uso...',
    });
  const handleReject = () =>
    runAction('reject', rejectLoan, OPERATION_IDS.rejectLoan, {
      title: 'Solicitação rejeitada',
      description: 'Empréstimo não autorizado para uso...',
    });
  const handleReturn = () =>
    runAction(
      'return',
      returnLoan,
      OPERATION_IDS.returnLoan,
      {
        title: 'Devolução registrada',
        description: 'A devolução do empréstimo foi registrada com sucesso!',
      },
      true
    );

  return { pendingAction, handleApprove, handleReject, handleReturn };
}

function useLoanExports(
  loan: Emprestimo | null,
  products: Emprestimo['produtos']
) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const [{ default: ExcelJS }, { default: FileSaver }] = await Promise.all([
        import('exceljs'),
        import('file-saver'),
      ]);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dados de Empréstimo');
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Item', key: 'item', width: 45 },
        { header: 'Quantidade', key: 'quant', width: 15 },
        { header: 'Lote', key: 'lote', width: 15 },
        { header: 'Tipo', key: 'tipo', width: 15 },
      ];
      products.forEach((productLoan) => {
        worksheet.addRow({
          id: productLoan.produto.id,
          item: productLoan.produto.nomeProduto,
          quant: productLoan.produto.quantidade,
          lote: productLoan.produto.lote?.codigoLote ?? 'Sem lote',
          tipo: productLoan.produto.tipoProduto,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      FileSaver.saveAs(blob, 'emprestimo.xlsx');
    } catch (error) {
      notifyError(error, OPERATION_IDS.loanById);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPdf = async () => {
    setIsExporting(true);
    try {
      const [{ pdf }, { LoanDoc }, { default: FileSaver }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/LoanDoc'),
        import('file-saver'),
      ]);
      const borrower = loan?.solicitante;
      const blob = await pdf(
        <LoanDoc
          name={borrower?.nomeCompleto ? userName(borrower) : 'Não encontrado'}
          nivel={
            borrower?.nivelUsuario
              ? borrower.nivelUsuario
              : 'Não encontrado'
          }
          data={
            loan?.produtos.map(({ quantidade, produto }) => [
              String(produto.id),
              produto.nomeProduto,
              String(quantidade),
              produto.lote?.codigoLote || 'Sem lote',
              produto.tipoProduto,
            ]) ?? []
          }
          title={`Dados de Empréstimo N° ${loan?.id ?? ''}`}
          columnWidths={columnWidthsExport}
          columns={columnsExport}
          signer={borrower?.nomeCompleto ? userName(borrower) : 'Não encontrado'}
        />
      ).toBlob();
      FileSaver.saveAs(blob, 'emprestimo_view.pdf');
    } catch (error) {
      notifyError(error, OPERATION_IDS.loanById);
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, exportToExcel, exportToPdf };
}

const isQueryLoanId = (resolution: ReturnType<typeof readIdFromLocation>) =>
  resolution.source === 'query' && resolution.id !== null;

const isLegacyLoanId = (resolution: ReturnType<typeof readIdFromLocation>) =>
  resolution.source === 'state' && resolution.id !== null;

const getLoanQueryId = (resolution: ReturnType<typeof readIdFromLocation>) =>
  isQueryLoanId(resolution) ? resolution.id : null;

const shouldRedirectLegacyLoan = (isLegacy: boolean, id: number | null) =>
  isLegacy && id !== null;

const shouldShowLoanLoading = (
  isLegacy: boolean,
  isValidQueryId: boolean,
  isLoading: boolean,
  loan: Emprestimo | null,
  loadError: unknown | null
) =>
  isLegacy ||
  (isValidQueryId && loan === null && loadError === null) ||
  (isLoading && loan === null);

const hasLoadedLoan = (
  isValidQueryId: boolean,
  loan: Emprestimo | null
): loan is Emprestimo => isValidQueryId && loan !== null;

const sortLoanProducts = (
  products: Emprestimo['produtos'],
  ascending: boolean
) => (ascending ? [...products] : [...products].reverse());

export type {
  Emprestimo as IEmprestimo,
  Lote as ILote,
  Produto as IProduto,
  ProdutoEmprestado as IEmprestimoProduto,
} from '@/contracts/loan';

function LoanHistoryMentee() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const idResolution = readIdFromLocation(location);
  const hasValidQueryId = isQueryLoanId(idResolution);
  const hasLegacyId = isLegacyLoanId(idResolution);
  const { isLoading, loan, loadError, fetchGetLoan } = useLoanDetails(
    getLoanQueryId(idResolution)
  );
  const navigateToParent = useCallback(
    () => navigate(resolveParentPath(location.pathname)),
    [location.pathname, navigate]
  );
  const { pendingAction, handleApprove, handleReject, handleReturn } =
    useLoanActions(loan, fetchGetLoan);

  useEffect(() => {
    if (!shouldRedirectLegacyLoan(hasLegacyId, idResolution.id)) return;

    navigate(
      buildDetailUrl(`${location.pathname}${location.search}`, idResolution.id),
      { replace: true, state: null }
    );
  }, [
    hasLegacyId,
    idResolution.id,
    location.pathname,
    location.search,
    navigate,
  ]);

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers = (loan?.produtos ?? []).filter((item) =>
    item.produto.nomeProduto.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedUsers = sortLoanProducts(filteredUsers, isAscending);
  const { isExporting, exportToExcel, exportToPdf } = useLoanExports(
    loan,
    sortedUsers
  );

  const showLoading = shouldShowLoanLoading(
    hasLegacyId,
    hasValidQueryId,
    isLoading,
    loan,
    loadError
  );

  if (showLoading) {
    return (
      <div
        role='status'
        className='flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas font-inter-medium text-clt-2'
      >
        <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
          <LoadingIcon />
        </div>
        Carregando...
        <BackLink />
      </div>
    );
  }

  if (!hasLoadedLoan(hasValidQueryId, loan)) {
    return (
      <main className='flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas p-6 text-clt-2'>
        {loadError !== null ? (
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.loanById}
            onRetry={fetchGetLoan}
            onNavigate={navigateToParent}
          />
        ) : (
          <p>Selecione um registro para consultar</p>
        )}
        <BackLink />
      </main>
    );
  }

  return (
    <>
      <main className='mx-auto flex min-h-svh w-full max-w-7xl min-w-0 flex-col items-center overflow-y-auto bg-canvas px-4 pb-12 text-clt-2 sm:px-6 lg:px-8'>
        {loadError !== null && (
          <div className='mt-6 w-full'>
            <ErrorFeedback
              error={loadError}
              operationId={OPERATION_IDS.loanById}
              onRetry={fetchGetLoan}
              onNavigate={navigateToParent}
            />
          </div>
        )}
        <div className='mt-5 w-full'>
          <BackLink />
        </div>
        <div className='mt-7 flex w-full min-w-0 flex-wrap items-center justify-between gap-4'>
          <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl md:text-3xl text-clt-2'>
            Histórico de Empréstimo - {loan?.status}
          </h1>
          <div className='flex items-center justify-between gap-x-6'>
            <OpenSearch />
          </div>
        </div>
        <section
          aria-label='Mentorado vinculado'
          className='mt-7 flex min-h-32 w-full min-w-0 flex-col rounded-xl border border-borderMy bg-surface'
        >
          <div className='w-full min-w-0 rounded-t-md border-b border-b-borderMy flex flex-wrap items-center justify-between gap-3 p-4'>
            <p className='font-rajdhani-medium text-clt-2 text-xl'>
              Mentorado Vinculado
            </p>
          </div>
          <div className='flex w-full min-w-0 flex-col items-center justify-center px-4'>
            <ResponsiveTable
              label='Mentorado vinculado'
              columns={studentColumns}
            >
              <HeaderTable />
              <div className='w-full min-w-0 items-center flex flex-col min-h-14'>
                <ItemOnly
                  data={[
                    userName(loan?.solicitante ?? null),
                    loan?.solicitante?.email ?? 'Não informado',
                    loan?.solicitante?.telefone ?? 'Não informado',
                  ]}
                />
              </div>
            </ResponsiveTable>
          </div>
        </section>
        <LoanProductsSection
          loan={loan}
          products={sortedUsers}
          pendingAction={pendingAction}
          onReturn={handleReturn}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          isAscending={isAscending}
          onToggleSortOrder={() => toggleSortOrder(!isAscending)}
          isExporting={isExporting}
          onExportPdf={() => void exportToPdf()}
          onExportExcel={() => void exportToExcel()}
        />
        <LoanDecisionActions
          loan={loan}
          pendingAction={pendingAction}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </main>
    </>
  );
}

export default LoanHistoryMentee;
