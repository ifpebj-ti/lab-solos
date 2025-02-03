import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { ShoppingCart, Users } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import PopoverInput from '@/components/global/inputs/PopoverInput';
import { unidades } from '@/mocks/Unidades';
import { useState } from 'react';

const selectProductSchema = z.object({
  group: z.string().nonempty('Selecione uma unidade de medida'),
  item: z.string().nonempty('Selecione uma unidade de medida'),
  quantity: z.string().nonempty('Selecione uma unidade de medida'),
});
type SelectItemFormData = z.infer<typeof selectProductSchema>;

// aqui virá as informções dos emprestimos da turma por completa
function LoanCreation() {
  const isLoading = false;
  const navigate = useNavigate();
  const [group, setGroup] = useState('');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const notifyProp = true;

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SelectItemFormData>({
    resolver: zodResolver(selectProductSchema),
  });
  function onSubmit() {
    navigate('/');
  }
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
              Criação de Empréstimo
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>Produto</p>
              <div className='relative'>
                <ShoppingCart size={25} stroke='#474747' strokeWidth={1.75} />
                {notifyProp && (
                  <span className='absolute top-0 left-full transform -translate-x-2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full'>
                    <div className=' flex items-center justify-center font-inter-bold text-[9px] text-white text-center mt-[1px] ml-[1px]'>
                      +9
                    </div>
                  </span>
                )}
              </div>
            </div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='flex flex-col items-center justify-center w-full'
            >
              <div className='flex items-center justify-between gap-x-5 w-full px-4'>
                <PopoverInput
                  title='Grupo'
                  unidades={unidades}
                  value={group}
                  onChange={(value) => {
                    setGroup(value);
                    setValue('group', value);
                  }}
                  error={errors.group?.message}
                />
                <PopoverInput
                  title='Item'
                  unidades={unidades}
                  value={item}
                  onChange={(value) => {
                    setItem(value);
                    setValue('item', value);
                  }}
                  error={errors.item?.message}
                />
              </div>
              <div className='flex items-center justify-between gap-x-5 w-full px-4 mb-5'>
                <PopoverInput
                  title='Quantidade'
                  unidades={unidades}
                  value={quantity}
                  onChange={(value) => {
                    setQuantity(value);
                    setValue('quantity', value);
                  }}
                  error={errors.quantity?.message}
                />
                <button
                  type='submit'
                  className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 mt-8 w-full rounded-sm hover:bg-opacity-90'
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
          <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Utilizadores
              </p>
              <div className='relative'>
                <Users size={25} stroke='#474747' strokeWidth={1.75} />
                {notifyProp && (
                  <span className='absolute top-0 left-full transform -translate-x-2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full'>
                    <div className=' flex items-center justify-center font-inter-bold text-[9px] text-white text-center mt-[1px] ml-[1px]'>
                      +9
                    </div>
                  </span>
                )}
              </div>
            </div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='flex flex-col items-center justify-center w-full'
            >
              <div className='flex items-center justify-between gap-x-5 w-full px-4 mb-5'>
                <PopoverInput
                  title='Quantidade'
                  unidades={unidades}
                  value={quantity}
                  onChange={(value) => {
                    setQuantity(value);
                    setValue('quantity', value);
                  }}
                  error={errors.quantity?.message}
                />
                <button
                  type='submit'
                  className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 mt-8 w-full rounded-sm hover:bg-opacity-90'
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
          <div className='w-11/12 mt-9 flex items-center justify-end'>
            <Link
              to={'/mentor/loan/review'}
              className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 w-96 rounded-sm hover:bg-opacity-90 flex items-center justify-center'
            >
              Solicitar Empréstimo
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default LoanCreation;
