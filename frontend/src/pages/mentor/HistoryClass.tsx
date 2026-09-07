import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { useEffect, useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../../public/icons/LayersIcon';
import Pagination from '@/components/global/table/Pagination';
import { getLoansByDependentes } from '@/integration/Class';
import { formatDateTime } from '@/function/date';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import type { Usuario } from '@/contracts/user';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';

const historyClassColumns: readonly ResponsiveColumn[] = [
  { key: 'id', label: 'Id', weight: 1.5 },
  { key: 'borrower', label: 'Mentorado Vinculado', weight: 3 },
  { key: 'date', label: 'Data', weight: 2 },
  { key: 'items', label: 'Itens Utilizados', weight: 2 },
  { key: 'status', label: 'Status', weight: 2 },
];

// Lote de produto
interface ILote {
  codigoLote: string;
  fornecedor: string;
  dataFabricacao: string;
  dataValidade: string;
  dataEntrada: string;
  produtos: IProduto[];
}

// Produto
interface IProduto {
  id: number;
  catmat: string;
  nomeProduto: string;
  fornecedor: string;
  tipoProduto: string;
  unidadeMedida: string;
  quantidade: number;
  quantidadeMinima: number;
  dataFabricacao: string | null;
  dataValidade: string | null;
  localizacaoProduto: string;
  status: string;
  lote: ILote | null;
}

// Produto vinculado ao empréstimo
interface IEmprestimoProduto {
  emprestimoId: number;
  produto: IProduto;
  quantidade: number;
}

// Empréstimo
interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  produtos: IEmprestimoProduto[];
  solicitante: Usuario | null;
  aprovador: Usuario | null;
}

function HistoryClass() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [loans, setLoans] = useState<IEmprestimo[]>([]);
  const itemsPerPage = 7;

  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getLoansByDependentes();
        setLoans(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setLoans([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, []);

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  // Filtragem baseada no termo de busca e status
  const filteredLoans = loans.filter((loan) => {
    const matchesText =
      loan.id.toString().includes(searchTerm) ||
      loan.solicitante?.nomeCompleto
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      value === 'todos' || loan.status.toLowerCase() === value.toLowerCase();
    return matchesText && matchesStatus;
  });

  // Ordenação dos empréstimos
  const sortedLoans = isAscending
    ? [...filteredLoans].sort((a, b) =>
      a.dataRealizacao.localeCompare(b.dataRealizacao)
    )
    : [...filteredLoans].sort((a, b) =>
      b.dataRealizacao.localeCompare(a.dataRealizacao)
    );

  // Dados da página atual
  const currentData = sortedLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Contagem de empréstimos por status
  const getLoanCountText = (type: string) => {
    if (!loans || !Array.isArray(loans)) return 0;

    if (type === 'devolvido') {
      return loans.filter(
        (loan) =>
          loan.dataDevolucao !== null && loan.dataDevolucao !== undefined
      ).length;
    }

    if (type === 'não devolvido') {
      return loans.filter(
        (loan) =>
          loan.dataDevolucao === null || loan.dataDevolucao === undefined
      ).length;
    }

    return 0;
  };
  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'devolvido', label: 'Devolvido' },
    { value: 'não devolvido', label: 'Não devolvido' },
  ];

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
        <div className='w-full min-w-0 md:w-[calc(100vw-var(--sidebar-width))] md:max-w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Histórico de Empréstimos
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>

          <div className='w-11/12 min-w-0 min-h-32 mt-7 flex flex-wrap items-center justify-center gap-4'>
            <FollowUpCard
              title='Devolvidos'
              number={getLoanCountText('devolvido')}
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Não devolvidos'
              number={getLoanCountText('não devolvido')}
              icon={<LayersIcon />}
            />
          </div>

          <div className='bg-white shadow-sm rounded-md w-11/12 min-w-0 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full min-w-0 flex flex-col-reverse lg:flex-row justify-between items-center mt-2 gap-4'>
              <div className='w-full min-w-0 lg:w-1/2 h-9 flex justify-start items-start gap-2'>
                <div className='w-auto flex items-center justify-evenly'>
                  <TopDown
                    onClick={() => toggleSortOrder(!isAscending)}
                    top={isAscending}
                  />
                </div>
                <div className='w-full flex items-center justify-evenly'>
                  <SearchInput
                    name='search'
                    onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
                    value={searchTerm}
                  />
                </div>
              </div>
              <div className='w-full min-w-0 lg:w-2/4 flex justify-end items-center'>
                <div className='w-full min-w-0 lg:w-1/2 -mt-2 lg:-mt-4'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => {
                      setValue(value);
                      setCurrentPage(1);
                    }}
                    value={value}
                  />
                </div>
              </div>
            </div>
            {/* 🔹 Container com scroll horizontal */}
            <div className='w-full min-w-0 mt-4'>
              <ResponsiveTable label='Histórico da turma' columns={historyClassColumns}>
                <HeaderTable />
                <div className='w-full items-center flex flex-col min-h-72'>
                  {currentData.length === 0 ? (
                    <div className='w-full h-40 flex flex-col items-center justify-center font-inter-regular text-clt-1 gap-3'>
                      <div className='text-6xl text-gray-300'>📋</div>
                      <p className='text-lg text-center'>
                        Nenhum empréstimo encontrado.
                      </p>
                      <p className='text-sm text-gray-500 text-center'>
                        Os empréstimos da sua turma aparecerão aqui quando houver
                        solicitações.
                      </p>
                    </div>
                  ) : (
                    currentData.map((loan, index) => (
                      <ClickableItemTable
                        key={index}
                        data={[
                          String(loan?.id),
                          String(loan.solicitante?.nomeCompleto),
                          formatDateTime(loan?.dataRealizacao),
                          String(loan.produtos.length),
                          loan?.status,
                        ]}
                        rowIndex={index}
                        id={loan.id}
                        destinationRoute='/mentor/history/loan'
                      />
                    ))
                  )}
                </div>
              </ResponsiveTable>
              </div>
            <div className='mb-4'>
              <Pagination
                totalItems={filteredLoans.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HistoryClass;
