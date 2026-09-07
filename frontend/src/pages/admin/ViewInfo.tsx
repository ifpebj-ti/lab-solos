import FollowUpCard from '@/components/screens/FollowUp';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import LayersIcon from '../../../public/icons/LayersIcon';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ItemViewInfo from '@/components/global/table/ItemViewInfo';
import OpenSearch from '@/components/global/OpenSearch';
import { registros } from '@/mocks/Unidades';
import UnderDevelopment from '@/components/global/UnderDevelopment';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/global/table/ResponsiveTable';

const infoColumns: readonly ResponsiveColumn[] = [
  { key: 'laboratory', label: 'Laboratório', weight: 2 },
  { key: 'date', label: 'Data', weight: 1.5 },
  { key: 'type', label: 'Tipo', weight: 1 },
  { key: 'location', label: 'Localização', weight: 2 },
  { key: 'responsible', label: 'Responsável', weight: 2 },
  { key: 'product', label: 'Produto', weight: 2 },
  { key: 'quantity', label: 'Quantidade', weight: 1 },
  { key: 'reason', label: 'Motivo', weight: 2 },
];

function ViewInfo() {
  const [value, setValue] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };

  const filteredUsers = registros.filter(
    (user) =>
      user.produto.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (value === 'todos' || String(user.ativo) === value)
  );
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();
  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'false', label: 'Pedidos' },
    { value: 'true', label: 'Ofertas' },
  ];
  return (
    <div className='w-full min-w-0 md:w-[calc(100vw-var(--sidebar-width))] md:max-w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy min-h-screen pb-9'>
      {/* Overlay de Em Desenvolvimento */}
      <UnderDevelopment
        title='Comunicação InterLab'
        description='Esta funcionalidade de comunicação entre laboratórios está sendo desenvolvida para facilitar a troca de informações e recursos.'
      />

      <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          Pedidos e ofertas
        </h1>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Link
            to={'/admin/create-info'}
            className='gap-x-4 border-borderMy border rounded-md flex items-center px-7 h-11 hover:bg-cl-table-item transition-all ease-in-out duration-200 shadow-sm'
          >
            <p className='font-inter-medium uppercase text-clt-2 text-sm line-clamp-2'>
              Criar Oferta ou Pedido
            </p>
          </Link>
          <OpenSearch />
        </div>
      </div>
      <div className='w-11/12 min-w-0 mt-7 flex flex-wrap items-center gap-4'>
        <FollowUpCard
          title='Todas Informações'
          number={String(53)}
          icon={<LayersIcon />}
        />
        <FollowUpCard
          title='Pedidos'
          number={String(22)}
          icon={<LayersIcon />}
        />
        <FollowUpCard
          title='Ofertas'
          number={String(31)}
          icon={<LayersIcon />}
        />
      </div>
      <div className='border border-borderMy rounded-md w-11/12 min-w-0 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
        <div className='w-full min-w-0 flex flex-wrap justify-between items-center mt-2 gap-3'>
          <div className='w-full min-w-0 md:w-2/4'>
            <SearchInput
              name='search'
              onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
              value={searchTerm}
            />
          </div>
          <div className='w-full min-w-0 md:w-2/4 flex flex-wrap justify-between gap-3'>
            <div className='w-auto flex items-center justify-evenly'>
              <TopDown
                onClick={() => toggleSortOrder(!isAscending)}
                top={isAscending}
              />
            </div>
            <div className='w-full min-w-0 md:w-1/2 -mt-1 md:-mt-4'>
              <SelectInput
                options={options}
                onValueChange={(value) => setValue(value)}
                value={value}
              />
            </div>
          </div>
        </div>
        <div className='w-full h-[1px] bg-borderMy mt-6 mb-6'></div>
        <ResponsiveTable label='Pedidos e ofertas' columns={infoColumns}>
          <div className='w-full min-w-0'>
            {sortedUsers.length === 0 ? (
              <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                Nenhum dado disponível para exibição.
              </div>
            ) : (
              sortedUsers.map((item, index) => (
                <ItemViewInfo
                  key={index}
                  nomeLaboratorio={item.nomeLaboratorio}
                  localizacao={item.localizacao}
                  data={item.data}
                  responsavel={item.responsavel}
                  quantidade={item.quantidade}
                  produto={item.produto}
                  motivo={item.motivo}
                  ativo={item.ativo}
                />
              ))
            )}
          </div>
        </ResponsiveTable>
      </div>
    </div>
  );
}

export default ViewInfo;
