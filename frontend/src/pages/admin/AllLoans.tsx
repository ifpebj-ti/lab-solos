import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { Link } from 'react-router-dom';
import FollowUpCard from '@/components/screens/FollowUp';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import { formatDate } from '../../function/date';
import { ArrowLeft, Check, ShieldAlert, Timer } from 'lucide-react';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import { getAllLoans } from '@/integration/Loans';
import ButtonLinkNotify from '@/components/screens/ButtonLinkNotify';
interface IUsuario {
  id: number;
  nomeCompleto: string;
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

interface IEmprestimo {
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

function AllLoans() {
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [loan, setLoan] = useState<IEmprestimo[]>([]);
  const [loanNotify, setLoanNotify] = useState<IEmprestimo[]>([]);
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAllLoans = async () => {
      try {
        const response = await getAllLoans();
        const filteredLoans = response.filter(
          (loan: { status: string }) => loan.status === 'Pendente'
        );

        setLoan(response);
        setLoanNotify(filteredLoans);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao buscar usuários', error);
        }
        setLoan([]);
      } finally {
        setIsLoading(false); // Stop loading after fetch (success or failure)
      }
    };
    fetchAllLoans();
  }, []);

  const headerTable = [
    { value: 'Data de Solicitação', width: '20%' },
    { value: 'Solicitante', width: '30%' },
    { value: 'Responsável', width: '30%' },
    { value: 'Status', width: '20%' },
  ];

  const options = [
    { value: 'todos', label: 'Todos' }, // Para exibir todos os usuários por padrão
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Rejeitado', label: 'Rejeitado' },
  ];

  const filteredUsers = loan.filter(
    (user) =>
      (value === 'todos' || user.status.toString() === value) &&
      user.status.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
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
      ) : currentData.length != 0 ? (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Histórico de Empréstimos
            </h1>
            <div className='flex items-center justify-between gap-x-4'>
              <ButtonLinkNotify
                text='Solicitações de Empréstimo'
                notify={loanNotify.length != 0 ? true : false}
                quant={loanNotify.length}
                link='/admin/loans-request'
              />
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
            <FollowUpCard
              title='Aprovados'
              number={getUserCountText('Aprovado')}
              icon={<Check stroke='#A9A9A9' width={20} />}
            />
            <FollowUpCard
              title='Pendentes'
              number={getUserCountText('Pendente')}
              icon={<Timer stroke='#A9A9A9' width={20} />}
            />
            <FollowUpCard
              title='Rejeitados'
              number={getUserCountText('Rejeitado')}
              icon={<ShieldAlert stroke='#A9A9A9' width={20} />}
            />
          </div>
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-2'>
              <div className='w-2/4'>
                <SearchInput
                  name='search'
                  onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
                  value={searchTerm}
                />
              </div>
              <div className='w-2/4 flex justify-between'>
                <div className='w-1/2 flex items-center justify-evenly'>
                  <TopDown
                    onClick={() => toggleSortOrder(!isAscending)}
                    top={isAscending}
                  />
                </div>
                <div className='w-1/2 -mt-4'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => {
                      setValue(value);
                      setCurrentPage(1); // Reinicia a paginação ao alterar o filtro
                    }}
                    value={value}
                  />
                </div>
              </div>
            </div>
            <HeaderTable columns={headerTable} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  currentData.map((rowData, index) => (
                    <ClickableItemTable
                      key={index}
                      data={[
                        formatDate(rowData?.dataRealizacao),
                        rowData?.solicitante?.nomeCompleto ||
                          'Nome não disponível',
                        rowData?.solicitante?.responsavel?.nomeCompleto ||
                          'Responsável não disponível',
                        rowData?.status || 'Status não disponível',
                      ]}
                      rowIndex={index}
                      columnWidths={headerTable.map((column) => column.width)}
                      destinationRoute={'/admin/history/loan'}
                      id={rowData.id}
                    />
                  ))
                )}
              </div>
              <Pagination
                totalItems={sortedUsers.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-center items-center flex-col overflow-y-auto bg-backgroundMy font-inter-regular text-lg'>
          <p>Erro durante requisição.</p>
          <Link
            to={'/'}
            className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
          >
            <ArrowLeft className='mt-[2px]' />
            Voltar
          </Link>
        </div>
      )}
    </>
  );
}

export default AllLoans;
