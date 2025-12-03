import OpenSearch from '../components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import HeaderTable from '@/components/global/table/Header';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import Pagination from '../components/global/table/Pagination'; // Importa o componente Pagination
import CalendarIcon from '../../public/icons/CalendarIcon';
import LayersIcon from '../../public/icons/LayersIcon';
import AlertIcon from '../../public/icons/AlertIcon';
import { useEffect, useState } from 'react';
import { columns, getUnidadePlural } from '@/mocks/Unidades';
import { getAlertProducts } from '@/integration/Product';
import ClickableItemTable from '@/components/global/table/ItemClickable';

interface IProduto {
  id: number;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string | Date | null;
  dataValidade: string | null;
  status: string;
  unidadeMedida: string;
}

function FollowUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [value, setValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [alert, setAlert] = useState<IProduto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const itemsPerPage = 7;

  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getAlertProducts();
        setAlert(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setAlert([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, []);

  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'validade', label: 'Validade' },
    { value: 'estoque', label: 'Estoque' },
  ];

  const filteredAlerts = alert.filter((item) => {
    const searchName = item.nomeProduto
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const isStockAlert = item.quantidade < item.quantidadeMinima;
    const isValidityAlert = !isStockAlert; // Todos os produtos que não são alerta de estoque são de validade

    if (value === 'estoque') return searchName && isStockAlert;
    if (value === 'validade') return searchName && isValidityAlert;
    return searchName; // 'todos' mostra ambos
  });

  const sortedUsers = isAscending
    ? [...filteredAlerts]
    : [...filteredAlerts].reverse();

  // Cálculo das páginas
  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
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
        <div className='w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy min-h-screen pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Acompanhamento
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7 flex  items-center justify-center flex-wrap gap-4'>
            <FollowUpCard
              title='Produtos com Alertas'
              number={alert.length}
              icon={<AlertIcon fill='#A9A9A9' size={19} />}
            />
            <FollowUpCard
              title='Produtos com Alerta de Validade'
              number={
                alert.filter((item) => item.quantidade >= item.quantidadeMinima)
                  .length
              }
              icon={<CalendarIcon />}
            />
            <FollowUpCard
              title='Produtos com Alerta de Estoque'
              number={
                alert.filter((item) => item.quantidade < item.quantidadeMinima)
                  .length
              }
              icon={<LayersIcon />}
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
              <div className='w-full lg:w-2/4 flex justify-end items-center'>
                <div className='w-full lg:w-1/2 -mt-2 lg:-mt-4'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => setValue(value)}
                    value={value}
                  />
                </div>
              </div>
            </div>

            {/* 🔹 Container com scroll horizontal */}
            <div className="w-full overflow-x-auto mt-4 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
              <div className='min-w-[800px]'>
                <HeaderTable columns={columns} />
                <div className='w-full items-center flex flex-col justify-start min-h-72'>
                  <div className='w-full'>
                    {currentData.length === 0 ? (
                      <div className='flex flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'>
                        <div className='text-6xl text-gray-300'>⚠️</div>
                        <p className='text-lg text-center'>
                          {alert.length === 0
                            ? 'Nenhum alerta de produto encontrado.'
                            : 'Nenhum produto encontrado para os filtros aplicados.'}
                        </p>
                        {alert.length === 0 && (
                          <p className='text-sm text-gray-500 text-center'>
                            Os alertas aparecerão aqui quando produtos estiverem com
                            estoque baixo ou próximos do vencimento.
                          </p>
                        )}
                      </div>
                    ) : (
                      currentData.map((rowData, index) => (
                        <ClickableItemTable
                          key={index}
                          data={[
                            rowData.nomeProduto || 'Não corresponde',
                            String(rowData.quantidade) +
                            ' ' +
                            getUnidadePlural(
                              String(rowData.unidadeMedida),
                              rowData.quantidade
                            ) || 'Não corresponde',
                            String(rowData.quantidadeMinima) +
                            ' ' +
                            getUnidadePlural(
                              String(rowData.unidadeMedida),
                              rowData.quantidadeMinima
                            ) || 'Não corresponde',
                            String(rowData.dataValidade) || 'Não corresponde',
                            rowData.status || 'Não corresponde',
                          ]}
                          rowIndex={index}
                          columnWidths={columns.map((column) => column.width)}
                          id={rowData.id}
                          destinationRoute='/admin/verification'
                        />
                      ))
                    )}
                  </div>

                </div>
              </div>
            </div>
            {/* Componente de Paginação - só aparece quando há dados */}
            {currentData.length > 0 && alert.length > 0 && (
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

export default FollowUp;
