import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import { columnsButtons, dataButton } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import ItemTable from '@/components/global/table/Item';
import { Link, useLocation } from 'react-router-dom';
import { getDependentesID } from '@/integration/Class';
import { getUserById } from '@/integration/Users';
import { IUser } from './Profile';

interface IUsuario {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string;
  status: string;
  nivelUsuario: string;
  cidade: string;
  curso: string;
  instituicao: string;
}

// aqui virá a listagem dos integrantes da turma
function ViewClass() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const location = useLocation();
  const id = location.state?.id; // Recupera o ID passado via state
  const [dependentes, setDependentes] = useState<IUsuario[]>([]);
  const [user, setUser] = useState<IUser>();


  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getDependentesID(id);
        const responseMy = await getUserById(id);
        setDependentes(response);
        setUser(responseMy);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao buscar dados de empréstimos:', error);
        }
        setDependentes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, [id]);

  console.log(dependentes);
  console.log(user);

  // Cálculo das páginas
  const currentData = dataButton.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const infoItems = [
    { title: 'Nome', value: 'Carlos Emanuel Santos de Oliveira', width: '50%' },
    {
      title: 'Email',
      value: 'carlos.oliveira@belojardim.ifpe.edu.br',
      width: '30%',
    },
    { title: 'Instituição', value: 'IFPE', width: '20%' },
  ];
  const infoItems2 = [{ title: 'CPF', value: '134.255.168-65', width: '100%' }];
  const infoItems3 = [
    { title: 'Número para Contato', value: '(81) 98126-5571', width: '100%' },
  ];
  const infoItems4 = [
    { title: 'Data de Ingresso', value: '29/11/2024 09:54', width: '100%' },
  ];
  const infoItems5 = [{ title: 'Curso', value: 'Eng. Hídrica', width: '100%' }];
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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Visualização de Turmas
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
              <Link
                to={'/history/class'}
                className='border border-borderMy rounded-md h-11 px-4 uppercase font-inter-medium text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200 flex items-center'
              >
                Empréstimos da Turma
              </Link>
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
                  onChange={() => console.log('build')}
                  value='1'
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

export default ViewClass;
