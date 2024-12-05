import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsButtons, dataButton } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import ItemTable from '@/components/global/table/Item';
import { getUserById } from '@/integration/Users';
import { formatDate } from '@/function/date';

interface IUsuario {
  instituicao: string;
  cidade: string;
  curso: string;
  id: number;
  nomeCompleto: string;
  email: string;
  senhaHash: string;
  telefone: string;
  dataIngresso: string;
  nivelUsuario: number;
  tipoUsuario: number;
  status: number;
  emprestimosSolicitados: null;
  emprestimosAprovados: null;
}

// aqui virá as informações de um único empréstimo
function MentoringHistory() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<IUsuario>();
  const itemsPerPage = 7;
  const id = 3;

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const response = await getUserById({ id });
        setUser(response);
      } catch (error) {
        console.error('Erro ao buscar usuários', error);
        setUser(undefined);
      } finally {
        setLoading(false); // Stop loading after fetch (success or failure)
      }
    };
    fetchGetUserById();
  }, []);

  // Cálculo das páginas
  const currentData = dataButton.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const infoItems = user
    ? [
        {
          title: 'Nome',
          value: user.nomeCompleto,
          width: '50%',
        },
        {
          title: 'Email',
          value: user.email,
          width: '30%',
        },
        { title: 'Instituição', value: user.instituicao, width: '20%' },
      ]
    : [];
  const infoItems2 = user
    ? [{ title: 'Cidade', value: user.cidade, width: '100%' }]
    : [];
  const infoItems3 = user
    ? [
        {
          title: 'Número para Contato',
          value: user.telefone,
          width: '100%',
        },
      ]
    : [];
  const infoItems4 = user
    ? [
        {
          title: 'Data de Ingresso',
          value: formatDate(user.dataIngresso),
          width: '100%',
        },
      ]
    : [];
  const infoItems5 = user
    ? [{ title: 'Curso', value: user.curso, width: '100%' }]
    : [];
  return (
    <>
      {loading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Histórico de Mentorados
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <InfoContainer items={infoItems} />
            <div className='w-full flex gap-x-8 mt-5'>
              <InfoContainer items={infoItems2} />
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
              <InfoContainer items={infoItems5} />
            </div>
          </div>
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-2'>
              <div className='w-2/4'>
                <SearchInput
                  name='search'
                  onChange={() => console.log('w')}
                  value='2'
                />
              </div>
              <div className='w-2/4 flex justify-between'>
                <div className='w-1/2 flex items-center justify-evenly'>
                  <TopDown onClick={() => console.log('s')} top={true} />
                  <TopDown onClick={() => console.log('s')} top={false} />
                </div>
                <div className='w-1/2 flex border border-borderMy rounded-sm items-center justify-between px-4 font-inter-medium text-clt-2 text-sm'>
                  <p>TOTAL:</p>
                  <p>{dataButton.length}</p>
                </div>
              </div>
            </div>
            <HeaderTable columns={columnsButtons} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.map((rowData, index) => (
                  <ItemTable
                    key={index}
                    data={[rowData.name, rowData.institution, rowData.code]}
                    rowIndex={index}
                    columnWidths={columnsButtons.map((column) => column.width)}
                  />
                ))}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={dataButton.length}
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

export default MentoringHistory;
