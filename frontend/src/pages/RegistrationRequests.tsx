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

interface IUsuario {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string; // Pode ser convertido para Date se necessário
  status: string; // Se houver status fixos
  nivelUsuario: 'Mentor' | 'Mentorado' | 'Administrador'; // Ajuste conforme necessário
  cidade: string;
  curso: string;
  instituicao: string;
}

function RegistrationRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const id = Cookie.get('rankID')!;
  const [approval, setApproval] = useState<IUsuario[]>([]);
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
          console.error('Erro ao buscar dados de empréstimos:', error);
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
      console.error('Erro ao aprovar dependente:', error);
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
      console.error('Erro ao aprovar dependente:', error);
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
          <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
            <FollowUpCard
              title='Mentores'
              number={approval.length}
              icon={<UserIcon />}
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
              </div>
            </div>
            <HeaderTable columns={columnsApproval22} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.length === 0 ? (
                  <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                    Nenhum dado disponível para exibição.
                  </div>
                ) : (
                  currentData.map((rowData, index) => (
                    <ItemTableButton
                      key={index}
                      data={[
                        String(rowData.dataIngresso) || 'Não corresponde',
                        String(rowData.nomeCompleto) || 'Não corresponde',
                        String(rowData.email) || 'Não corresponde',
                        String(rowData.instituicao) || 'Não corresponde',
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
              {/* Componente de Paginação */}
              <Pagination
                totalItems={currentData.length}
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

export default RegistrationRequest;
