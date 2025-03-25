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
import { getLoansById } from '@/integration/Loans';
import { useLocation } from 'react-router-dom';
import ItemOnly from '@/components/global/table/ItemOnly';

export interface IProduto {
  id: number;
  nomeProduto: string;
  tipo: string;
  fornecedor: string;
  unidadeMedida: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string | null;
  dataValidade: string | null;
  status: string;
  loteId: string;
}

export interface IEmprestimoProduto {
  id: number;
  emprestimoId: number;
  produtoId: number;
  produto: IProduto;
  quantidade: number;
}

export interface IUsuarioII {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string | null;
  dataIngresso: string;
  status: string | null;
  nivelUsuario: string | null;
  nomeResponsavel: string | null;
  responsavelId: number | null;
}

export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  emprestimoProdutos: IEmprestimoProduto[]; // Corrigido para refletir a estrutura real do JSON
  solicitante: IUsuarioII;
  aprovador: IUsuarioII | null; // Pode ser `null`
}

function LoanHistoryMentee() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [loan, setLoan] = useState<IEmprestimo>();
  const location = useLocation();
  const id = location.state?.id;

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

  console.log(loan)

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers =
    loan?.emprestimoProdutos?.filter((item) =>
      item.produto.nomeProduto.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();
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
              Histórico de Empréstimo
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
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Produtos Selecionados
              </p>
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
                        rowData.produto.tipo || 'Não Corresponde',
                        String(
                          rowData.quantidade || 'Não Corresponde'
                        ) +
                          getUnidadeSigla(
                            String(rowData.produto.unidadeMedida)
                          ),
                        String(rowData.produto.loteId || 'Não Corresponde'),
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
        </div>
      )}
    </>
  );
}

export default LoanHistoryMentee;
