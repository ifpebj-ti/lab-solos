import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import {
  columnsEstudantesSelected,
  columnsItensSelected,
  getUnidadeSigla,
} from '@/mocks/Unidades';
import ItemTable from '@/components/global/table/Item';
import { useEffect, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { approveLoan, getLoansById, rejectLoan } from '@/integration/Loans';
import { useLocation, useNavigate } from 'react-router-dom';
import ItemOnly from '@/components/global/table/ItemOnly';
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

export interface IUsuarioII {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string;
  status: string;
  nivelUsuario: string;
  tipoUsuario: string;
  instituicao?: string;
  cidade?: string;
  curso?: string;
  responsavel: IUsuarioII | null;
}

export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  produtos: IEmprestimoProduto[];
  solicitante: IUsuarioII;
  aprovador: IUsuarioII | null;
}

function LoanHistoryMentee() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [loan, setLoan] = useState<IEmprestimo>();
  const location = useLocation();
  const id = location.state?.id;
  const columnsExport = [
    { value: 'ID', width: '10%' },
    { value: 'Item', width: '45%' },
    { value: 'Quantidade', width: '15%' },
    { value: 'Lote', width: '15%' },
    { value: 'Tipo', width: '15%' },
  ];
  const columnWidthsExport = ['10%', '45%', '15%', '15%', '15%'];

  useEffect(() => {
    const fetchGetLoan = async () => {
      setIsLoading(true);
      try {
        const response = await getLoansById({ id });
        setLoan(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setLoan(undefined);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoan();
  }, [id]);

  const handleApprove = async (loanId: number) => {
    try {
      await approveLoan(loanId);
      toast({
        title: 'Solicitação aceita',
        description: 'Empréstimo autorizado para uso...',
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Erro ao aprovar empréstimo:', error);
      }
      toast({
        title: 'Erro durante requisição',
        description: 'Tente novamente mais tarde...',
      });
    }
  };
  const handleReject = async (loanId: number) => {
    try {
      await rejectLoan(loanId);
      toast({
        title: 'Solicitação rejeitada',
        description: 'Empréstimo não autorizado para uso...',
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Erro ao reprovar empréstimo:', error);
      }
      toast({
        title: 'Erro durante requisição',
        description: 'Tente novamente mais tarde...',
      });
    }
  };

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
  const navigate = useNavigate();
  interface IHandle {
    id: number | string;
  }

  const handleClick = ({ id }: IHandle) => {
    navigate('/admin/return', { state: { id } });
  };

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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Histórico de Empréstimo - {loan?.status}
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Mentorado Vinculado
              </p>
            </div>
            <div className='flex flex-col items-center justify-center w-full px-4'>
              <HeaderTable columns={columnsEstudantesSelected} />
              <div className='w-full items-center flex flex-col min-h-14'>
                <ItemOnly
                  data={[
                    String(loan?.solicitante?.nomeCompleto),
                    String(loan?.solicitante?.email),
                    String(loan?.solicitante?.telefone),
                  ]}
                  columnWidths={columnsEstudantesSelected.map(
                    (column) => column.width
                  )}
                />
              </div>
            </div>
          </div>
          <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-3'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Produtos Selecionados
              </p>
              {loan?.status === 'Aprovado' && (
                <button
                  onClick={() =>
                    loan?.id !== undefined && handleClick({ id: loan.id })
                  }
                  className='font-rajdhani-semibold text-primaryMy text-xl h-10 border border-primaryMy px-4 rounded-md hover:bg-cl-table-item flex gap-x-3 items-center justify-center transition-all ease-in-out duration-150'
                >
                  Devolução
                  <RefreshCw stroke='#16a34a' width={20} />
                </button>
              )}
            </div>
            <div className='flex flex-col items-center justify-center w-full px-4'>
              <div className='flex items-center justify-start gap-x-7 mt-5 w-full'>
                <div className='w-[40%]'>
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
                    <button className='border border-borderMy rounded-sm h-9 w-9 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200'>
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
              <HeaderTable columns={columnsItensSelected} />
              <div className='w-full items-center flex flex-col min-h-40'>
                {sortedUsers.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  sortedUsers.map((rowData, index) => (
                    <ItemTable
                      key={index}
                      data={[
                        String(rowData.produto.id || 'Não Corresponde'),
                        rowData.produto.nomeProduto || 'Não Corresponde',
                        rowData.produto.tipoProduto || 'Não Corresponde',
                        String(rowData.quantidade || 'Não Corresponde') +
                          getUnidadeSigla(
                            String(rowData.produto.unidadeMedida)
                          ),
                        String(rowData.produto.lote || 'Não Corresponde'),
                      ]}
                      rowIndex={index}
                      columnWidths={columnsItensSelected.map(
                        (column) => column.width
                      )}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          {loan?.status != 'Aprovado' ? (
            <div className='w-11/12 gap-x-5 h-10 mt-6 flex items-center justify-end'>
              <button
                onClick={() => loan?.id !== undefined && handleApprove(loan.id)}
                className='h-full w-28 rounded-md border border-red-600 font-inter-medium transition-all ease-in-out hover:scale-[1.02] text-red-600 hover:bg-red-600 hover:text-white'
              >
                Rejeitar
              </button>
              <button
                onClick={() => loan?.id !== undefined && handleReject(loan.id)}
                className='h-full w-28 rounded-md border border-green-600 font-inter-medium transition-all ease-in-out hover:scale-[1.02] text-green-600 hover:bg-green-600 hover:text-white'
              >
                Aceitar
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

export default LoanHistoryMentee;
