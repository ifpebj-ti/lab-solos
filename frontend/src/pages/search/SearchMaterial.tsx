import OpenSearch from '../../components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import HeaderTable from '@/components/global/table/Header';
import ItemTable from '@/components/global/table/Item';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import Pagination from '../../components/global/table/Pagination';
import UserIcon from '../../../public/icons/UserIcon';
import LayersIcon from '../../../public/icons/LayersIcon';
import UsersIcon from '../../../public/icons/UsersIcon';
import { useEffect, useRef, useState } from 'react';
import { generateRandomData, ChemicalData } from '@/mocks/Unidades';
import { useUser } from '@/components/context/UserProvider';

function SearchMaterial() {
  const { rankID } = useUser();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [testData, setTestData] = useState<ChemicalData[]>([]);

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
  const isLoading = false;
  const [value, setValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Colunas e dados da tabela
  const columns = [
    { value: 'Catmat', width: '10%' },
    { value: 'Item', width: '20%' },
    { value: 'Lote', width: '15%' },
    { value: 'Quant. Estoque', width: '20%' },
    { value: 'Mínimo', width: '15%' },
    { value: 'Data de Validade', width: '20%' },
  ];

  useEffect(() => {
    const generatedData = generateRandomData();
    setTestData(generatedData);
  }, []);

  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'vidrarias', label: 'Vidrarias' },
    { value: 'quimicos', label: 'Quimicos' },
    { value: 'outros', label: 'Outros' },
  ];

  // Cálculo das páginas
  const currentData = testData.slice(
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
            {String(rankID) === '1' && (
              <FollowUpCard
                title='Usuários Admin'
                number='2'
                icon={<UserIcon />}
              />
            )}
            {String(rankID) === '1' && (
              <FollowUpCard title='Usuários' number='39' icon={<UsersIcon />} />
            )}
            <FollowUpCard
              title='Tipos de Vidrarias'
              number='87'
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Usos de Vidrarias'
              number='254'
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Tipos de Químicos'
              number='62'
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Usos de Químicos'
              number='441'
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Tipos de Outros'
              number='39'
              icon={<LayersIcon />}
            />
            <FollowUpCard
              title='Usos de Outros'
              number='249'
              icon={<LayersIcon />}
            />
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
                {currentData.map((rowData, index) => (
                  <ItemTable
                    key={index}
                    data={[
                      rowData.codigo,
                      rowData.nome,
                      rowData.lote,
                      rowData.numeroAleatorio,
                      rowData.numeroMinimo,
                      rowData.data,
                    ]}
                    rowIndex={index}
                    columnWidths={columns.map((column) => column.width)}
                  />
                ))}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={testData.length}
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
