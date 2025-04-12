import LoadingIcon from '../../../public/icons/LoadingIcon';
import { ShoppingCart } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PopoverInput from '@/components/global/inputs/PopoverInput';
import { useState } from 'react';
import InputText from '@/components/global/inputs/Text';
import OpenSearch from '@/components/global/OpenSearch';

const selectProductSchema = z.object({
  group: z.string().nonempty('Selecione um grupo de produto'),
  item: z.string().nonempty('Selecione uma unidade de medida'),
  quantity: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Quantidade deve ser um número inteiro positivo.',
    }),
  tipo: z.string().nonempty('Selecione um tipo de aviso'),
});

type SelectItemFormData = z.infer<typeof selectProductSchema>;

// produto, quantidade, motivo, tipo
function CreateInfo() {
  const isLoading = false;
  const [group, setGroup] = useState('');
  const [tipo, setTipo] = useState('');
  const [item, setItem] = useState('');

  const {
    register,
    setValue,
    formState: { errors },
  } = useForm<SelectItemFormData>({
    resolver: zodResolver(selectProductSchema),
  });

  const unidadesTypes = [
    { value: 'Quimico', label: 'Químico' },
    { value: 'Vidraria', label: 'Vidraria' },
    { value: 'Outro', label: 'Outro' },
  ];

  const action = [
    { value: 'Pedido', label: 'Pedido' },
    { value: 'Oferta', label: 'Oferta' },
  ];

  const filteredProducts = [
    { id: 1, nomeProduto: 'Químico' },
    { id: 2, nomeProduto: 'Físico' },
  ];

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
              Criação de Oferta/pedido
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-h-32 mt-9 rounded-md border border-borderMy flex flex-col shadow-sm'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Produtos
              </p>
              <div className='relative'>
                <ShoppingCart size={25} stroke='#474747' strokeWidth={1.75} />
              </div>
            </div>
            <form
              onSubmit={() => console.log('opa')}
              className='flex flex-col items-center justify-center w-full'
            >
              <div className='flex items-center justify-between gap-x-5 w-full px-4'>
                <PopoverInput
                  title='Grupo'
                  unidades={unidadesTypes}
                  value={group}
                  onChange={(value) => {
                    setGroup(value);
                    setValue('group', value);
                  }}
                  error={errors.group?.message}
                />
                <PopoverInput
                  title='Item'
                  unidades={filteredProducts.map((produto) => ({
                    value: String(produto.id),
                    label: produto.nomeProduto,
                  }))}
                  value={item}
                  onChange={(value) => {
                    setItem(value);
                    setValue('group', value);
                  }}
                  error={errors.item?.message}
                />
              </div>
              <div className='flex items-center justify-center gap-x-5 w-full px-4'>
                <div className='w-1/2'>
                  <InputText
                    label={'Quantidade'}
                    type={'number'}
                    register={register}
                    name={'quantity'}
                    error={errors.quantity?.message}
                  />
                </div>
                <div className='w-1/2 flex gap-x-5'>
                  <div className='w-full flex flex-col'>
                    <p className='font-inter-regular text-clt-2 text-sm mt-3'>
                      Unidade de Medida
                    </p>
                    <div className='w-full flex items-center pl-3 text-clt-2 font-inter-regular text-sm h-9 border border-borderMy mt-1'>
                      s
                    </div>
                  </div>
                </div>
              </div>
              <div className='flex items-center justify-between gap-x-5 w-full px-4 mb-6'>
                <div className='w-1/2'>
                  <PopoverInput
                    title='Tipo de Aviso'
                    unidades={action}
                    value={tipo}
                    onChange={(value) => {
                      setTipo(value);
                      setValue('tipo', value);
                    }}
                    error={errors.tipo?.message}
                  />
                </div>
                <div className='w-1/2 mt-[34px]'>
                  <button
                    onClick={() => console.log('w')}
                    disabled={false}
                    className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 w-full rounded-sm hover:bg-opacity-90 flex items-center justify-center transition-all ease-in-out duration-150'
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateInfo;
