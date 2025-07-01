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
    <div className='w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy min-h-screen pb-9'>
      {/* Overlay de Em Desenvolvimento */}
      <UnderDevelopment
        title='Comunicação InterLab'
        description='Esta funcionalidade de comunicação entre laboratórios está sendo desenvolvida para facilitar a troca de informações e recursos.'
      />

      <div className='w-11/12 flex items-center justify-between mt-7'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          Pedidos e ofertas
        </h1>
        <div className='flex items-center justify-between gap-x-5'>
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
      <div className='w-11/12 h-32 mt-7 flex items-center gap-x-8'>
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
        <div className='w-full h-[1px] bg-borderMy mt-6 mb-6'></div>
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
    </div>
  );
}

export default ViewInfo;
