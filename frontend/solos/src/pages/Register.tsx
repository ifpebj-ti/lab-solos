import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PopoverInput from '@/components/global/inputs/PopoverInput';
import SelectInput from '@/components/global/inputs/SelectInput';
import DateInput from '@/components/global/inputs/DateInput';
import InputText from '@/components/global/inputs/Text';
import SearchIcon from '../../public/icons/SearchIcon';
import { zodResolver } from '@hookform/resolvers/zod';
import { unidades, options } from '@/mocks/Unidades';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';

const submitCreateVidrariaSchema = z.object({
  nome: z.string().min(8, 'O nome deve ter pelo menos 8 caracteres'),
  formula: z
    .string()
    .min(1, 'A fórmula não pode ser vazia')
    .refine(
      (val) => /[a-zA-Z]/.test(val),
      'A fórmula deve conter pelo menos uma letra'
    ),
  catmat: z.string().min(6, 'O código CATMAT deve ter mais de 5 caracteres'),
  quantidade: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Quantidade deve ser um número inteiro positivo.',
    }),
  minimo: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Quantidade mínima deve ser um número inteiro positivo.',
    }),
  lote: z.string().min(5, 'O lote deve ter mais de 4 caracteres'),
  // validade: z.date().refine((val) => val > new Date(), {
  //   message: 'A data de validade deve estar no futuro.',
  // }),
  localizacao: z
    .string()
    .min(21, 'A localização deve ter mais de 20 caracteres'),
  medida: z.string().nonempty('Selecione uma unidade de medida'),
  grupo: z.string().nonempty('Selecione um grupo'),
});

type CreateVidrariaFormData = z.infer<typeof submitCreateVidrariaSchema>;

function Register() {
  const navigate = useNavigate();
  const [medida, setMedida] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateVidrariaFormData>({
    resolver: zodResolver(submitCreateVidrariaSchema),
  });
  function postCreateVidraria() {
    navigate('/');
  }

  return (
    <div className='h-full w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
      <div className='w-11/12 flex items-center justify-between mt-7'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          Cadastro de Bens
        </h1>
        <div className='flex items-center justify-between'>
          <button className='border border-borderMy rounded-md h-11 w-11 mr-6 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200'>
            <SearchIcon fill='#232323' />
          </button>
          <Link
            to={'/launch'}
            className='border border-borderMy rounded-md h-11 px-4 uppercase font-inter-medium text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200 flex items-center'
          >
            Realizar Lançamento
          </Link>
        </div>
      </div>
      <div className='w-11/12 min-h-96 mt-6'>
        <Tabs defaultValue='quimicos' className='w-full'>
          <TabsList className='w-full flex items-center justify-between h-[52px] border border-borderMy rounded-md px-2'>
            <TabsTrigger
              value='quimicos'
              className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
            >
              Químicos
            </TabsTrigger>
            <TabsTrigger
              value='vidrarias'
              className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
            >
              Vidrarias
            </TabsTrigger>
            <TabsTrigger
              value='outros'
              className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
            >
              Outros
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value='quimicos'
            className='w-full mt-10 rounded-md border border-borderMy p-4'
          >
            <form
              onSubmit={handleSubmit(postCreateVidraria)}
              className='w-full gap-y-3 flex flex-col'
            >
              <div className='w-full h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3'>
                <InputText
                  label='Nome'
                  type='text'
                  register={register}
                  error={errors.nome?.message}
                  name='nome'
                />
                <InputText
                  label='Fórmula Química'
                  type='text'
                  register={register}
                  error={errors.formula?.message}
                  name='formula'
                />
                <InputText
                  label='Catmat'
                  type='text'
                  register={register}
                  error={errors.catmat?.message}
                  name='catmat'
                />
                <InputText
                  label='Quantidade'
                  type='number'
                  register={register}
                  error={errors.quantidade?.message}
                  name='quantidade'
                />
                <InputText
                  label='Quantidade Mínima'
                  type='number'
                  register={register}
                  error={errors.minimo?.message}
                  name='minimo'
                />
                <InputText
                  label='Lote'
                  type='text'
                  register={register}
                  error={errors.lote?.message}
                  name='lote'
                />
                <InputText
                  label='Localização do Produto'
                  type='text'
                  register={register}
                  error={errors.localizacao?.message}
                  name='localizacao'
                />
                <SelectInput
                  label='Grupo'
                  options={options}
                  value={errors.grupo ? '' : ''} // Aqui, você pode definir o valor inicial de acordo com seu caso
                  onValueChange={(value) => setValue('grupo', value)}
                  error={errors.grupo?.message} // Erro associado ao campo 'grupo'
                />
                <DateInput />
                <PopoverInput
                  unidades={unidades}
                  value={medida}
                  onChange={(value) => {
                    setMedida(value);
                    setValue('medida', value); // atualiza o estado do formulário
                  }}
                  error={errors.medida?.message}
                />
              </div>
              <div className='flex gap-x-5'>
                <button
                  type='submit'
                  className='font-rajdhani-semibold text-primaryMy text-base bg-backgroundMy h-9 mt-8 w-full rounded-sm border border-primaryMy hover:bg-cl-table-item'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 mt-8 w-full rounded-sm hover:bg-opacity-90'
                >
                  Criar Conta
                </button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value='vidrarias'>
            Change your password here.
          </TabsContent>
          <TabsContent value='outros'>Outros.</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Register;
