import OpenSearch from '../../components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import HeaderTable from '@/components/global/table/Header';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import Pagination from '../../components/global/table/Pagination';
import LayersIcon from '../../../public/icons/LayersIcon';
import { useEffect, useRef, useState } from 'react';
import { getAllProducts } from '@/integration/Product';
import { getSystemQuantities } from '@/integration/System';
import ClickableItemTable from '@/components/global/table/ItemClickable';

export interface IAllProducts {
  id: number;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string; // Pode ser null ou vazio
  dataValidade: string; // Data no formato string
  status: string;
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
    Rejeitado: number;
    Total: number;
  };
  totalProdutosEmprestados: number;
}

function SearchMaterial() {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  // scroll
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<IAllProducts[]>([]);
  const [system, setSystem] = useState<DashboardData>();

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const allProducts = await getAllProducts();
        const systemQuant = await getSystemQuantities();
        setProducts(allProducts);
        setSystem(systemQuant);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao buscar dados necessários', error);
        }
      } finally {
        setIsLoading(false); // Stop loading after fetch (success or failure)
      }
    };
    fetchAllProducts();
  }, []);

  console.log(system)
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
    const walk = (x - startX) * 2; // Ajuste a velocidade de arraste se necessário
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Colunas e dados da tabela
  const columns = [
    { value: 'ID', width: '15%' },
    { value: 'Nome', width: '35%' },
    { value: 'Tipo', width: '20%' },
    { value: 'Quantidade', width: '15%' },
    { value: 'Status', width: '15%' },
  ];

  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'Vidraria', label: 'Vidrarias' },
    { value: 'Quimico', label: 'Quimicos' },
    { value: 'Outro', label: 'Outros' },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const filteredUsers = products.filter((item) => {
    const searchName = item.nomeProduto
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = value === 'todos' || item.tipoProduto === value;
    return searchName && matchesType;
  });
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
        <div className='w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Pesquisa
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
            className='w-11/12 h-32 mt-7 flex items-center gap-x-8 overflow-x-auto scrollbar-hide'
            style={{ cursor: 'grab' }}
          >
            <FollowUpCard
              title='Tipos de Vidrarias'
              number={String(system?.produtos.Vidraria)}
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Tipos de Químicos'
              number={String(system?.produtos.Quimico)}
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Tipos de Outros'
              number={String(system?.produtos.Outro)}
              icon={<LayersIcon />}
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
                    onValueChange={(value) => setValue(value)}
                    value={value}
                  />
                </div>
              </div>
            </div>
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
                        String(rowData.status),
                      ]}
                      rowIndex={index}
                      columnWidths={columns.map((column) => column.width)}
                      destinationRoute='/mentor/verification'
                      id={rowData.id}
                    />
                  ))
                )}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={filteredUsers.length}
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

export default SearchMaterial;
