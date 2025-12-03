import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import UserIcon from '../../../public/icons/UserIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsApproval } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import { SquareCheck, SquareX } from 'lucide-react';
import { approveLoan, getAllLoans, rejectLoan } from '@/integration/Loans';
import { toast } from '@/components/hooks/use-toast';
import { formatDateTime } from '@/function/date';
import ItemTableButtonLink from '@/components/global/table/ItemButtonLink';

interface IUsuario {
  id: number;
  nomeCompleto: string;
  nomeResponsavel: string;
  email: string;
  senhaHash: string;
  telefone: string;
  dataIngresso: string;
  nivelUsuario: string;
  tipoUsuario: string;
  status: string;
  emprestimosSolicitados: IEmprestimo[] | null;
  emprestimosAprovados: IEmprestimo[] | null;
  responsavelId: number | null;
  responsavel: IUsuario | null;
  dependentes: IUsuario[] | null;
}

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
  emprestimoProdutos: IEmprestimoProduto[] | null;
}

interface IEmprestimoProduto {
  id: number;
  emprestimoId: number;
  produtoId: number;
  produto: IProduto | null;
  quantidade: number;
  emprestimo: IEmprestimo | null;
}

export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  emprestimoProdutos: (IEmprestimoProduto | null)[]; // Permite null no array
  solicitanteId: number;
  solicitante: IUsuario | null;
  aprovadorId: number | null;
  aprovador: IUsuario | null;
}

function LoansRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [loan, setLoan] = useState<IEmprestimo[]>([]);
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  useEffect(() => {
    const fetchAllLoans = async () => {
      setIsLoading(true);
      try {
        const response = await getAllLoans();
        const filteredLoans = response.filter(
          (loan: { status: string }) => loan.status === 'Pendente'
        );
        setLoan(filteredLoans);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar usuários', error);
        }
        setLoan([]);
      } finally {
        setIsLoading(false); // Stop loading after fetch (success or failure)
      }
    };
    fetchAllLoans();
  }, []);
  const handleApprove = async (solicitanteId: number) => {
    try {
      await approveLoan(solicitanteId);
      toast({
        title: 'Solicitação aceita',
        description: 'Empréstimo autorizado para uso...',
      });
      const response = await getAllLoans();
      const filteredLoans = response.filter(
        (loan: { status: string }) => loan.status === 'Pendente'
      );
      setLoan(filteredLoans);
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
  const handleReject = async (solicitanteId: number) => {
    try {
      await rejectLoan(solicitanteId);
      toast({
        title: 'Solicitação rejeitada',
        description: 'Empréstimo não autorizado para uso...',
      });
      const response = await getAllLoans();
      const filteredLoans = response.filter(
        (loan: { status: string }) => loan.status === 'Pendente'
      );
      setLoan(filteredLoans);
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
  const filteredUsers = loan.filter((user) =>
    user.solicitante?.nomeCompleto
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();
  // Cálculo das páginas
  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getUserCountText = (statusLoan: string) => {
    const count = loan.filter((user) => user.status == statusLoan).length;
    return `${count}`;
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
            <h1 className='uppercase font-rajdhani-medium text-2xl lg:text-3xl text-clt-2'>
              Solicitações de Empréstimos
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12  mt-7 flex justify-center items-center md:justify-start gap-x-8'>
            <FollowUpCard
              title='Empréstimos'
              number={getUserCountText('Pendente')}
              icon={<UserIcon />}
            />
          </div>
          <div className='bg-white shadow-sm rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex flex-col-reverse lg:flex-row justify-between items-center mt-2 gap-4'>
              <div className='w-full lg:w-1/2 h-9 flex justify-start items-start gap-2'>
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
            </div>
            {/* 🔹 Container com scroll horizontal */}
            <div className="w-full overflow-x-auto mt-4 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
              <div className='min-w-[800px]'>
                <HeaderTable columns={columnsApproval} />
                <div className='w-full items-center flex flex-col justify-start min-h-72'>
                  <div className='w-full'>
                    {currentData.length === 0 ? (
                      <div className='flex flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'>
                        <div className='text-6xl text-gray-300'>📋</div>
                        <p className='text-lg text-center'>
                          {loan.length === 0
                            ? 'Nenhuma solicitação de empréstimo pendente.'
                            : 'Nenhuma solicitação encontrada para os filtros aplicados.'}
                        </p>
                        {loan.length === 0 && (
                          <p className='text-sm text-gray-500 text-center'>
                            As solicitações de empréstimo aparecerão aqui quando
                            usuários enviarem pedidos para aprovação.
                          </p>
                        )}
                      </div>
                    ) : (
                      currentData.map((rowData, index) => (
                        <ItemTableButtonLink
                          key={index}
                          data={[
                            formatDateTime(String(rowData.dataRealizacao)) ||
                            'Não corresponde',
                            String(rowData.solicitante?.nomeCompleto) ||
                            'Não corresponde',
                            String(rowData.solicitante?.email) || 'Não corresponde',
                          ]}
                          rowIndex={index}
                          columnWidths={columnsApproval.map(
                            (column) => column.width
                          )}
                          onClick1={() => handleReject(rowData.id)}
                          onClick2={() => handleApprove(rowData.id)}
                          icon1={
                            <SquareX width={20} height={20} stroke='#dd1313' />
                          }
                          icon2={
                            <SquareCheck width={20} height={20} stroke='#16a34a' />
                          }
                          id={rowData.id}
                          destinationRoute='/admin/history/loan'
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Componente de Paginação - só aparece quando há dados */}
            {currentData.length > 0 && loan.length > 0 && (
              <div className='mt-auto'>
                <Pagination
                  totalItems={sortedUsers.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default LoansRequest;
