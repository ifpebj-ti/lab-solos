import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import UserIcon from '../../public/icons/UserIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsApproval22 } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import ItemTableButton from '@/components/global/table/ItemButton';
import { SquareCheck, SquareX } from 'lucide-react';
import Cookie from 'js-cookie';
import {
  getDependentesForApproval,
  rejectDependente,
} from '@/integration/Class';
import { approveDependente } from '../integration/Class';
import { toast } from '@/components/hooks/use-toast';
import { displayUserValue, formatCivilDate } from '@/function/date';
import type { Dependente } from '@/contracts/user';

function RegistrationRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const id = Cookie.get('rankID')!;
  const [approval, setApproval] = useState<Dependente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getDependentesForApproval(id);
        setApproval(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setApproval([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, [id]);

  const handleApprove = async (solicitanteId: number) => {
    try {
      await approveDependente(solicitanteId);
      toast({
        title: 'Solicitação aceita',
        description: 'Usuário autorizado para acesso à plataforma...',
      });
      const response = await getDependentesForApproval(id);
      setApproval(response);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Erro ao aprovar dependente:', error);
      }
      toast({
        title: 'Erro durante requisição',
        description: 'Tente novamente mais tarde...',
      });
    }
  };
  const handleReject = async (solicitanteId: number) => {
    try {
      await rejectDependente(solicitanteId);
      toast({
        title: 'Solicitação rejeitada',
        description: 'Usuário não autorizado para acesso à plataforma...',
      });
      const response = await getDependentesForApproval(id);
      setApproval(response);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Erro ao aprovar dependente:', error);
      }
      toast({
        title: 'Erro durante requisição',
        description: 'Tente novamente mais tarde...',
      });
    }
  };
  const filteredUsers = approval.filter((user) =>
    user.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();
  // Cálculo das páginas
  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
              Solicitações de Cadastro
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>

          <div className='w-11/12 h-32 mt-7 flex items-center justify-center gap-x-8'>
            <FollowUpCard
              title='Mentores'
              number={approval.length}
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
                <HeaderTable columns={columnsApproval22} />
                <div className='w-full items-center flex flex-col justify-center min-h-72'>
                  <div className='w-full'>
                    {currentData.length === 0 ? (
                      <div className='flex flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'>
                        <div className='text-6xl text-gray-300'>📝</div>
                        <p className='text-lg text-center'>
                          {approval.length === 0
                            ? 'Nenhuma solicitação de cadastro pendente.'
                            : 'Nenhuma solicitação encontrada para os filtros aplicados.'}
                        </p>
                        {approval.length === 0 && (
                          <p className='text-sm text-gray-500 text-center'>
                            As solicitações de cadastro aparecerão aqui quando
                            usuários solicitarem acesso.
                          </p>
                        )}
                      </div>
                    ) : (
                      currentData.map((rowData, index) => (
                        <ItemTableButton
                          key={index}
                          data={[
                            formatCivilDate(rowData.dataIngresso),
                            rowData.nomeCompleto,
                            rowData.email,
                            displayUserValue(rowData.instituicao),
                          ]}
                          rowIndex={index}
                          columnWidths={columnsApproval22.map(
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
                        />
                      ))
                    )}
                  </div>
                  {/* Componente de Paginação - só aparece quando há dados */}
                  {currentData.length > 0 && approval.length > 0 && (
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RegistrationRequest;
