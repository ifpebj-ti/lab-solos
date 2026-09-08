import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { getUnidadePlural } from '@/mocks/Unidades';
import ItemTable from '@/components/global/table/Item';
import { useCallback, useEffect, useState } from 'react';
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
import { PDFDownloadLink } from '@react-pdf/renderer';
import FileSaver from 'file-saver';
import ExcelJS from 'exceljs';
import { LoanDoc } from '@/components/pdf/LoanDoc';
import type { Usuario } from '@/contracts/user';

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

export interface ILote {
  codigoLote: string;
  fornecedor: string;
  dataFabricacao: string;
  dataValidade: string;
  dataEntrada: string;
  produtos: IProduto[]; // normalmente vazio aqui
}

export interface IProduto {
  id: number;
  catmat: string;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string;
  unidadeMedida: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string;
  dataValidade: string;
  status: string;
  lote: ILote;
}

export interface IEmprestimoProduto {
  emprestimoId: number;
  produto: IProduto;
  quantidade: number;
}

export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  produtos: IEmprestimoProduto[];
  solicitante: Usuario;
  aprovador: Usuario | null;
}

function LoanHistoryMentee() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const [loan, setLoan] = useState<IEmprestimo | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pendingAction, setPendingAction] = useState<
    'approve' | 'reject' | 'return' | null
  >(null);
  const location = useLocation();
  const navigate = useNavigate();
  const id = location.state?.id;
  const columnsExport = [
    { value: 'ID', width: '10%' },
    { value: 'Item', width: '45%' },
    { value: 'Quantidade', width: '15%' },
    { value: 'Lote', width: '15%' },
    { value: 'Tipo', width: '15%' },
  ];
  const columnWidthsExport = ['10%', '45%', '15%', '15%', '15%'];

  const fetchGetLoan = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await getLoansById({ id });
      setLoan(response);
      setLoadError(null);
      return true;
    } catch (error) {
      setLoadError(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchGetLoan();
  }, [fetchGetLoan]);

  const runAction = async (
    action: 'approve' | 'reject' | 'return',
    mutation: (loanId: number) => Promise<unknown>,
    operation: typeof OPERATION_IDS.approveLoan | typeof OPERATION_IDS.rejectLoan | typeof OPERATION_IDS.returnLoan,
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
        lote: loan.produto.lote.codigoLote,
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
  };

  if (isLoading && loan === null) {
    return (
      <div
        role='status'
        className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'
      >
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando...
      </div>
    );
  }

  if (loan === null) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-backgroundMy p-6'>
        {loadError !== null && (
          <ErrorFeedback
            error={loadError}
            operationId={OPERATION_IDS.loanById}
            onRetry={fetchGetLoan}
            onNavigate={() => navigate(-1)}
          />
        )}
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
              onNavigate={() => navigate(-1)}
            />
          </div>
        )}
          <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
            <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl md:text-3xl text-clt-2'>
              Histórico de Empréstimo - {loan?.status}
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
                      loan?.solicitante?.nomeCompleto ?? 'Não informado',
                      loan?.solicitante?.email ?? 'Não informado',
                      loan?.solicitante?.telefone ?? 'Não informado',
                    ]}
                  />
                </div>
              </ResponsiveTable>
            </div>
          </div>
          <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
            <div className='w-full min-w-0 rounded-t-md border-b border-b-borderMy flex flex-wrap items-center justify-between gap-3 p-3'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Produtos Selecionados
              </p>
              {loan?.status === 'Aprovado' && !loan?.dataDevolucao && (
                <button
                  type='button'
                  onClick={handleReturn}
                  disabled={pendingAction === 'return'}
                  className='font-rajdhani-semibold text-green-600 text-xl h-10 border border-green-600 px-4 rounded-md hover:bg-green-50 flex gap-x-3 items-center justify-center transition-all ease-in-out duration-150'
                >
                  Registrar Devolução
                  <RefreshCw stroke='#16a34a' width={20} />
                </button>
              )}
              {loan?.status === 'Aprovado' && loan?.dataDevolucao && (
                <div className='flex items-center gap-x-2 text-green-600'>
                  <RefreshCw stroke='#16a34a' width={16} />
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
                    onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
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
                      className='border border-borderMy rounded-sm min-h-11 min-w-11 md:h-9 md:w-9 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200'
                    >
                      <FileText stroke='#232323' width={21} strokeWidth={1.5} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className='w-32 shadow-lg border border-borderMy bg-backgroundMy p-2'>
                    <ul className='w-full flex flex-col items-start gap-y-1'>
                      <li className='w-full hover:bg-gray-300 rounded py-1 flex px-2 font-inter-regular bg-cl-table-item text-sm items-center'>
                        <PDFDownloadLink
                          document={
                            <LoanDoc
                              name={
                                loan?.solicitante?.nomeCompleto
                                  ? loan?.solicitante?.nomeCompleto
                                  : 'Não encontrado'
                              }
                              nivel={
                                loan?.solicitante?.nivelUsuario
                                  ? loan?.solicitante?.nivelUsuario
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
                                loan?.solicitante.nomeCompleto
                                  ? loan?.solicitante.nomeCompleto
                                  : 'Não encontrado'
                              }
                            />
                          }
                          fileName='emprestimo_view.pdf'
                          className='flex items-center justify-center'
                        >
                          <FileText
                            stroke='#232323'
                            width={18}
                            strokeWidth={1.5}
                            className='mr-1 mt-[2px]'
                          />
                          PDF
                        </PDFDownloadLink>
                      </li>
                      <li
                        className='w-full hover:bg-gray-300 rounded py-1 flex px-2 font-inter-regular bg-cl-table-item text-sm items-center cursor-pointer'
                        onClick={exportToExcel}
                      >
                        <FileText
                          stroke='#232323'
                          width={18}
                          strokeWidth={1.5}
                          className='mr-1 mt-[2px]'
                        />
                        Excel
                      </li>
                    </ul>
                  </PopoverContent>
                </Popover>
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
          </div>
          {loan?.status != 'Aprovado' ? (
            <div className='w-11/12 min-w-0 gap-3 h-10 mt-6 flex flex-wrap items-center justify-end'>
              <button
                type='button'
                onClick={handleReject}
                disabled={pendingAction === 'reject'}
                className='h-full w-28 rounded-md border border-red-600 font-inter-medium transition-all ease-in-out hover:scale-[1.02] text-red-600 hover:bg-red-600 hover:text-white'
              >
                Rejeitar
              </button>
              <button
                type='button'
                onClick={handleApprove}
                disabled={pendingAction === 'approve'}
                className='h-full w-28 rounded-md border border-green-600 font-inter-medium transition-all ease-in-out hover:scale-[1.02] text-green-600 hover:bg-green-600 hover:text-white'
              >
                Aceitar
              </button>
            </div>
          ) : null}
        </div>
    </>
  );
}

export default LoanHistoryMentee;
