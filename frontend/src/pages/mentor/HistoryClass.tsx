import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { columnsHistories } from '@/mocks/Unidades';
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

// Usuário (Solicitante ou Aprovador)
interface IUsuario {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string;
  nivelUsuario: string;
  tipoUsuario: string;
  status: string;
  instituicao?: string;
  cidade?: string;
  curso?: string;
  responsavel: IUsuario | null;
}

// Empréstimo
interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  produtos: IEmprestimoProduto[];
  solicitante: IUsuario | null;
  aprovador: IUsuario | null;
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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Histórico de Empréstimos
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
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
          <div className='w-11/12 min-h-32 mt-8 rounded-md border border-borderMy flex flex-col'>
            <div className='flex flex-col items-center justify-center w-full px-4'>
              <div className='flex items-center justify-start gap-x-7 mt-6 w-full'>
                <div className='w-[40%]'>
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
                <div className='w-[30%] -mt-4'>
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
              <HeaderTable columns={columnsHistories} />
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
                      columnWidths={columnsHistories.map(
                        (column) => column.width
                      )}
                      id={loan.id}
                      destinationRoute='/mentor/history/loan'
                    />
                  ))
                )}
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
        </div>
      )}
    </>
  );
}

export default HistoryClass;
