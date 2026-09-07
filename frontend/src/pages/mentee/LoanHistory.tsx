import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import ItemTable from '@/components/global/table/Item';
import { useEffect, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { getLoansById } from '@/integration/Loans';
import { useLocation } from 'react-router-dom';
import ItemOnly from '@/components/global/table/ItemOnly';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
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

interface IProduto {
  id: number;
  nomeProduto: string;
  fornecedor: string;
  tipo: string;
  quantidade: number;
  quantidadeMinima: number;
  dataFabricacao: string | null;
  dataValidade: string | null;
  localizacaoProduto: string;
  status: string;
  ultimaModificacao: string;
  loteId: number | null;
  lote: unknown | null;
}

interface IEmprestimoProduto {
  id: number;
  emprestimoId: number;
  produtoId: number;
  produto: IProduto;
  quantidade: number;
}

interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string;
  status: string;
  emprestimoProdutos: IEmprestimoProduto[];
  solicitanteId: number;
  solicitante: Usuario | null;
  aprovadorId: number;
  aprovador: Usuario | null;
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
        <div
          role='status'
          className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'
        >
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full min-w-0 flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
            <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl md:text-3xl text-clt-2'>
              Histórico de Empréstimo
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
                    onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
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
                          rowData.produto.id
                            ? String(rowData.produto.id)
                            : 'Não informado',
                          rowData.produto.nomeProduto || 'Não informado',
                          rowData.produto.tipo || 'Não informado',
                          rowData.produto.quantidade
                            ? String(rowData.produto.quantidade)
                            : 'Não informado',
                          rowData.produto.loteId == null
                            ? 'Não informado'
                            : String(rowData.produto.loteId),
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
      )}
    </>
  );
}

export default LoanHistoryMentee;
