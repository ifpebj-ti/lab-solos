import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsLoan } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { getUserById } from '@/integration/Users';
import { displayUserValue, formatCivilDate, formatDateTime } from '@/function/date';
import Cookie from 'js-cookie';
import { getLoansByUserId } from '@/integration/Loans';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import { academicoSchema, type Academico } from '@/contracts/user';

export interface IProduto {
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
  lote: unknown | null; // Use `unknown` para tipo indefinido
  emprestimoId: number;
  emprestimo: unknown | null;
}
export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string;
  status: string;
  produtos: IProduto[];
  solicitanteId: number;
  solicitante: unknown | null; // Use `unknown` para tipo indefinido
  aprovadorId: number;
  aprovador: unknown | null;
}

function HistoryMentoring() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<Academico>();
  const itemsPerPage = 7;
  const id = Cookie.get('rankID')!;
  const [loans, setLoans] = useState<IEmprestimo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const response = await getUserById({ id });
        const academicResult = academicoSchema.safeParse(response);
        setUser(academicResult.success ? academicResult.data : undefined);

        // Tentar buscar empréstimos, mas tratar 404 como caso normal (sem empréstimos)
        try {
          const loansResponse = await getLoansByUserId({ id });
          setLoans(loansResponse);
        } catch (loansError: unknown) {
          // Se for 404, significa que o usuário não tem empréstimos (caso normal)
          const error = loansError as { response?: { status?: number } };
          if (error?.response?.status === 404) {
            setLoans([]); // Define array vazio para usuário sem empréstimos
          } else {
            // Para outros erros, re-lança a exceção
            throw loansError;
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados usuários', error);
        }
        setUser(undefined);
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGetUserById();
  }, [id]);

  const filteredUsers = loans.filter((item) => {
    const searchName = item.dataRealizacao
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return searchName;
  });
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  // Cálculo das páginas
  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const infoItems = user
    ? [
      {
        title: 'Nome',
        value: user.nomeCompleto,
        width: '100%',
      },
    ]
    : [];
  const infoItems2 = user
    ? [
      {
        title: 'Email',
        value: displayUserValue(user.email),
        width: '100%',
      },
    ]
    : [];
  const infoItems3 = user
    ? [
      {
        title: 'Instituição',
        value: displayUserValue(user.instituicao),
        width: '100%'
      },
    ]
    : [];
  const infoItems4 = user
    ? [
      {
        title: 'Cidade',
        value: displayUserValue(user.cidade),
        width: '100%'
      }]
    : [];
  const infoItems5 = user
    ? [
      {
        title: 'Número para Contato',
        value: displayUserValue(user.telefone),
        width: '100%',
      },
    ]
    : [];
  const infoItems6 = user
    ? [
      {
        title: 'Data de Ingresso',
        value: formatCivilDate(user.dataIngresso),
        width: '100%',
      },
    ]
    : [];
  const infoItems7 = user
    ? [
      {
        title: 'Curso',
        value: displayUserValue(user.curso),
        width: '100%'
      }
    ]
    : [];
  return (
    <>
      {loading ? (
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
              Histórico de Mentorados
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 flex flex-wrap mt-7 gap-y-3'>
            <div className='w-full flex flex-wrap gap-y-3 lg:flex lg:flex-wrap lg:gap-y-3 justify-between lg:gap-x-4'>
              <InfoContainer items={infoItems} />
              <InfoContainer items={infoItems2} />
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
              <InfoContainer items={infoItems5} />
              <InfoContainer items={infoItems6} />
              <InfoContainer items={infoItems7} />
            </div>
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
              <div className='w-full lg:w-2/4 flex justify-end items-center'>
                <div className='w-1/2 h-9 flex border border-borderMy rounded-sm items-center justify-between px-4 font-inter-medium text-clt-2 text-sm'>
                  <p>TOTAL:</p>
                  <p>{searchTerm ? sortedUsers.length : loans.length}</p>
                </div>
              </div>
            </div>

            {/* 🔹 Container com scroll horizontal */}
            <div className="w-full overflow-x-auto mt-4 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
              <div className='min-w-[800px]'>
                <HeaderTable columns={columnsLoan} />
                <div className='w-full items-center flex flex-col justify-start min-h-72'>
                  <div className='w-full'>
                    {currentData.length === 0 ? (
                      <div className='w-full h-40 flex flex-col items-center justify-center font-inter-regular text-clt-1 gap-3'>
                        <div className='text-6xl text-gray-300'>📋</div>
                        <p className='text-lg text-center'>
                          {loans.length === 0
                            ? 'Você ainda não possui empréstimos registrados.'
                            : 'Nenhum empréstimo encontrado para os filtros aplicados.'}
                        </p>
                        {loans.length === 0 && (
                          <p className='text-sm text-gray-500 text-center'>
                            Seus empréstimos aparecerão aqui quando você realizar
                            solicitações.
                          </p>
                        )}
                      </div>
                    ) : (
                      currentData.map((rowData, index) => (
                        <ClickableItemTable
                          key={index}
                          data={[
                            String(rowData.id),
                            formatDateTime(rowData.dataRealizacao),
                            Array.isArray(rowData.produtos)
                              ? String(rowData.produtos.length)
                              : '0',
                            rowData.status,
                          ]}
                          rowIndex={index}
                          columnWidths={columnsLoan.map((column) => column.width)}
                          destinationRoute='/mentee/history/loan'
                          id={rowData.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Componente de Paginação - só aparece quando há dados */}
            {currentData.length > 0 && loans.length > 0 && (
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

export default HistoryMentoring;
