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

const userName = (user: Usuario | null) =>
  user?.nomeCompleto ?? 'Não informado';

export type {
  Emprestimo as IEmprestimo,
  Lote as ILote,
  Produto as IProduto,
  ProdutoEmprestado as IEmprestimoProduto,
} from '@/contracts/loan';

function LoanHistoryMentee() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const [loan, setLoan] = useState<Emprestimo | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pendingAction, setPendingAction] = useState<
    'approve' | 'reject' | 'return' | null
  >(null);
  const [isExporting, setIsExporting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const idResolution = readIdFromLocation(location);
  const requestSequence = useRef(0);
  const hasValidQueryId =
    idResolution.source === 'query' && idResolution.id !== null;
  const hasLegacyId =
    idResolution.source === 'state' && idResolution.id !== null;
  const navigateToParent = useCallback(
    () => navigate(resolveParentPath(location.pathname)),
    [location.pathname, navigate]
  );
  const columnsExport = [
    { value: 'ID', width: '10%' },
    { value: 'Item', width: '45%' },
    { value: 'Quantidade', width: '15%' },
    { value: 'Lote', width: '15%' },
    { value: 'Tipo', width: '15%' },
  ];
  const columnWidthsExport = ['10%', '45%', '15%', '15%', '15%'];

  useEffect(() => {
    if (!hasLegacyId || idResolution.id === null) return;

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

  const fetchGetLoan = useCallback(async (): Promise<boolean> => {
    if (!hasValidQueryId || idResolution.id === null) {
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
      const response = await getLoansById({ id: idResolution.id });
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
  }, [hasValidQueryId, idResolution.id]);

  useEffect(() => {
    void fetchGetLoan();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchGetLoan]);

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

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers =
    loan?.produtos?.filter((item) =>
      item.produto.nomeProduto.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();
  const exportToExcel = async () => {
    setIsExporting(true);

    try {
      const [{ default: ExcelJS }, { default: FileSaver }] = await Promise.all([
        import('exceljs'),
        import('file-saver'),
      ]);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dados de Empréstimo');

      // Definir os cabeçalhos da planilha
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Item', key: 'item', width: 45 },
        { header: 'Quantidade', key: 'quant', width: 15 },
        { header: 'Lote', key: 'lote', width: 15 },
        { header: 'Tipo', key: 'tipo', width: 15 },
      ];

      // Adicionar os dados da tabela
      sortedUsers.forEach((loan) => {
        worksheet.addRow({
          id: loan.produto.id,
          item: loan.produto.nomeProduto,
          quant: loan.produto.quantidade,
          lote: loan.produto.lote?.codigoLote ?? 'Sem lote',
          tipo: loan.produto.tipoProduto,
        });
      });

      // Criar o arquivo Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Baixar o arquivo
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
      const blob = await pdf(
        <LoanDoc
          name={
            loan?.solicitante?.nomeCompleto
              ? userName(loan.solicitante)
              : 'Não encontrado'
          }
          nivel={
            loan?.solicitante?.nivelUsuario
              ? loan.solicitante.nivelUsuario
              : 'Não encontrado'
          }
          data={
            loan?.produtos?.map(({ quantidade, produto }) => [
              String(produto.id),
              produto.nomeProduto,
              String(quantidade),
              produto.lote?.codigoLote || 'Sem lote',
              produto.tipoProduto,
            ]) ?? []
          }
          title={'Dados de Empréstimo N° ' + loan?.id}
          columnWidths={columnWidthsExport}
          columns={columnsExport}
          signer={
            loan?.solicitante?.nomeCompleto
              ? userName(loan.solicitante)
              : 'Não encontrado'
          }
        />
      ).toBlob();
      FileSaver.saveAs(blob, 'emprestimo_view.pdf');
    } catch (error) {
      notifyError(error, OPERATION_IDS.loanById);
    } finally {
      setIsExporting(false);
    }
  };

  const showLoading =
    hasLegacyId ||
    (hasValidQueryId && loan === null && loadError === null) ||
    (isLoading && loan === null);

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

  if (!hasValidQueryId || loan === null) {
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
        <section
          aria-label='Produtos selecionados'
          className='mt-7 flex min-h-32 w-full min-w-0 flex-col rounded-xl border border-borderMy bg-surface'
        >
          <div className='w-full min-w-0 rounded-t-md border-b border-b-borderMy flex flex-wrap items-center justify-between gap-3 p-3'>
            <p className='font-rajdhani-medium text-clt-2 text-xl'>
              Produtos Selecionados
            </p>
            {loan?.status === 'Aprovado' && !loan?.dataDevolucao && (
              <button
                type='button'
                onClick={handleReturn}
                disabled={pendingAction === 'return'}
                className='flex h-11 items-center justify-center gap-x-3 rounded-md border border-success px-4 font-rajdhani-semibold text-xl text-success transition-colors hover:bg-surface-selected'
              >
                Registrar Devolução
                <RefreshCw className='text-success' width={20} />
              </button>
            )}
            {loan?.status === 'Aprovado' && loan?.dataDevolucao && (
              <div className='flex items-center gap-x-2 text-success'>
                <RefreshCw className='text-success' width={16} />
                <span className='font-rajdhani-semibold text-lg'>
                  Empréstimo Devolvido
                </span>
              </div>
            )}
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
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type='button'
                    aria-label='Exportar empréstimo'
                    className='flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy transition-colors hover:bg-surface-selected md:h-9 md:w-9'
                  >
                    <FileText
                      className='text-clt-2'
                      width={21}
                      strokeWidth={1.5}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent className='w-32 border border-borderMy bg-surface p-2 shadow-lg'>
                  <ul className='w-full flex flex-col items-start gap-y-1'>
                    <li className='flex w-full items-center rounded py-1 px-2 text-sm font-inter-regular transition-colors hover:bg-surface-selected'>
                      <button
                        type='button'
                        onClick={() => void exportToPdf()}
                        disabled={isExporting}
                        aria-busy={isExporting}
                        className='flex items-center justify-center disabled:cursor-wait disabled:opacity-60'
                        /* <LoanDoc
                              name={
                                loan?.solicitante?.nomeCompleto
                                  ? userName(loan.solicitante)
                                  : 'Não encontrado'
                              }
                              nivel={
                                loan?.solicitante?.nivelUsuario
                                  ? loan.solicitante.nivelUsuario
                                  : 'Não encontrado'
                              }
                              data={
                                loan?.produtos?.map(
                                  ({ quantidade, produto }) => [
                                    String(produto.id),
                                    produto.nomeProduto,
                                    String(quantidade),
                                    produto.lote?.codigoLote || 'Sem lote',
                                    produto.tipoProduto,
                                  ]
                                ) ?? []
                              }
                              title={'Dados de Empréstimo N° ' + loan?.id}
                              columnWidths={columnWidthsExport}
                              columns={columnsExport}
                              signer={
                                loan?.solicitante?.nomeCompleto
                                  ? userName(loan.solicitante)
                                  : 'Não encontrado'
                              }
                            />
                          } */
                      >
                        <FileText
                          width={18}
                          strokeWidth={1.5}
                          className='mr-1 mt-[2px] text-clt-2'
                        />
                        PDF
                      </button>
                    </li>
                    <li className='flex w-full items-center rounded py-1 px-2 text-sm font-inter-regular transition-colors hover:bg-surface-selected'>
                      <button
                        type='button'
                        aria-label='Exportar Excel'
                        aria-busy={isExporting}
                        disabled={isExporting}
                        onClick={() => void exportToExcel()}
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
            <ResponsiveTable
              label='Produtos selecionados'
              columns={productColumns}
            >
              <HeaderTable />
              <div className='flex min-h-40 w-full min-w-0 flex-col items-center'>
                {sortedUsers.length === 0 ? (
                  <div className='flex h-40 w-full items-center justify-center font-inter-regular text-clt-1'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  sortedUsers.map((rowData, index) => (
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
                  ))
                )}
              </div>
            </ResponsiveTable>
          </div>
        </section>
        {loan?.status != 'Aprovado' ? (
          <div className='mt-6 flex h-11 w-full min-w-0 flex-wrap items-center justify-end gap-3'>
            <button
              type='button'
              onClick={handleReject}
              disabled={pendingAction === 'reject'}
              className='h-11 w-28 rounded-md border border-danger font-inter-medium text-danger transition-colors hover:bg-danger hover:text-on-danger'
            >
              Rejeitar
            </button>
            <button
              type='button'
              onClick={handleApprove}
              disabled={pendingAction === 'approve'}
              className='h-11 w-28 rounded-md border border-success font-inter-medium text-success transition-colors hover:bg-success hover:text-on-success'
            >
              Aceitar
            </button>
          </div>
        ) : null}
      </main>
    </>
  );
}

export default LoanHistoryMentee;
