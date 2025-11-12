import OpenSearch from '../global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import FollowUpCard from './FollowUp';
import HeaderTable from '../global/table/Header';
import SearchInput from '../global/inputs/SearchInput';
// import TopDown from '../global/table/TopDown';
import SelectInput from '../global/inputs/SelectInput';
import Pagination from '../global/table/Pagination';
import LayersIcon from '../../../public/icons/LayersIcon';
import { useEffect, useRef, useState } from 'react';
import { getAllProducts } from '@/integration/Product';
import { getSystemQuantities } from '@/integration/System';
import ClickableItemTable from '../global/table/ItemClickable';

export interface IAllProducts {
  id: number;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string;
  dataValidade: string;
  status: string;
  unidadeMedida?: string;
}

interface DashboardData {
  produtos: {
    Quimico: number;
    Vidraria: number;
    Outro: number;
    Total: number;
  };
  alertas: {
    ProdutosVencidos: number;
    ProdutosEmBaixa: number;
  };
  usuarios: {
    Administrador: number;
    Mentor: number;
    Mentorado: number;
    Total: number;
  };
  emprestimos: {
    Aprovado: number;
    Pendente: number;
    Rejeitado?: number;
    Total: number;
  };
  totalProdutosEmprestados: number;
}

interface SearchMaterialComponentProps {
  userType: 'admin' | 'mentor' | 'mentee';
  destinationRoute: string;
}

function SearchMaterialComponent({
  userType,
  destinationRoute,
}: SearchMaterialComponentProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<IAllProducts[]>([]);
  const [system, setSystem] = useState<DashboardData>();

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const allProducts = await getAllProducts();
        const systemQuant = await getSystemQuantities();
        setProducts(allProducts);
        setSystem(systemQuant.data);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados necessários', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Colunas adaptáveis baseadas no tipo de usuário
  const columns = [
    { value: 'ID', width: '12%' },
    { value: 'Nome', width: '28%' },
    { value: 'Tipo', width: '18%' },
    { value: 'Quantidade', width: '12%' },
    { value: 'Unidade', width: '15%' },
    { value: 'Status', width: '15%' },
  ];

  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'Vidraria', label: 'Vidrarias' },
    { value: 'Quimico', label: 'Químicos' },
    { value: 'Outro', label: 'Outros' },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  // const [isAscending, setIsAscending] = useState(true);
  const [isAscending] = useState(true);

  // const toggleSortOrder = (ascending: boolean) => {
  //   setIsAscending(ascending);
  // };

  const filteredProducts = products.filter((item) => {
    const searchName = item.nomeProduto
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = value === 'todos' || item.tipoProduto === value;
    return searchName && matchesType;
  });

  const sortedUsers = isAscending
    ? [...filteredProducts]
    : [...filteredProducts].reverse();

  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Títulos adaptáveis baseados no tipo de usuário
  const getTitle = () => {
    switch (userType) {
      case 'admin':
        return 'Pesquisa - Administrador';
      case 'mentor':
        return 'Pesquisa - Mentor';
      case 'mentee':
        return 'Pesquisa - Mentorado';
      default:
        return 'Pesquisa';
    }
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
        <div className='w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy min-h-screen '>
          <div className='w-11/12 flex items-center justify-between mt-5 lg:mt-10'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              {getTitle()}
            </h1>
            <div className='flex items-center justify-between'>
              <OpenSearch />
            </div>
          </div>
          <div
            ref={scrollContainerRef}
            onMouseDown={startDrag}
            onMouseLeave={stopDrag}
            onMouseUp={stopDrag}
            onMouseMove={onDrag}
            className='w-11/12 flex items-center justify-center gap-4 mt-10 lg:mt-5 flex-wrap'
          >
            <FollowUpCard
              title='Tipos de Vidrarias'
              number={String(
                system?.produtos.Vidraria != undefined
                  ? String(system?.produtos.Vidraria)
                  : 0
              )}
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Tipos de Químicos'
              number={String(
                system?.produtos.Quimico != undefined
                  ? String(system?.produtos.Quimico)
                  : 0
              )}
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Tipos de Outros'
              number={String(
                system?.produtos.Outro != undefined
                  ? String(system?.produtos.Outro)
                  : 0
              )}
              icon={<LayersIcon />}
            />
          </div>
          <div className='bg-white shadow-sm rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex flex-col lg:flex-row justify-between items-center mt-2 gap-4'>
              <div className='w-full lg:w-2/4'>
                <SearchInput
                  name='search'
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                />
              </div>
              <div className='w-full lg:w-2/4 flex justify-between'>
                <div className='w-1/2 -mt-2 lg:-mt-4'>
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
                            String(rowData.id),
                            String(rowData.nomeProduto),
                            String(rowData.tipoProduto),
                            String(rowData.quantidade),
                            String(rowData.unidadeMedida),
                            String(rowData.status),
                          ]}
                          rowIndex={index}
                          columnWidths={columns.map((column) => column.width)}
                          destinationRoute={destinationRoute}
                          id={rowData.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Pagination
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default SearchMaterialComponent;
