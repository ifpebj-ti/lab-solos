import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InputText from '@/components/global/inputs/Text';
import SearchIcon from '../../public/icons/SearchIcon';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const submitCreateVidrariaSchema = z.object({
  nome: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  formula: z.string(),
  catmat: z.string(),
  quantidade: z.number(),
  minimo: z.number(),
  lote: z.string(),
  validade: z.date(),
  localizacao: z.string(),
  medida: z.string(),
  grupo: z.string(),
});

type CreateVidrariaFormData = z.infer<typeof submitCreateVidrariaSchema>;

function Launch() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
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
          Realizar Lançamento
        </h1>
        <div className='flex items-center justify-between'>
          <button className='border border-borderMy rounded-md h-11 w-11 mr-6 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200'>
            <SearchIcon fill='#232323' />
          </button>
        </div>
      </div>
      <div className='w-11/12 min-h-96 mt-6'>
        <Tabs defaultValue='vidrarias' className='w-full'>
          <TabsList className='w-full flex items-center justify-between h-[52px] border border-borderMy rounded-md px-2'>
            <TabsTrigger
              value='vidrarias'
              className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
            >
              Vidrarias
            </TabsTrigger>
            <TabsTrigger
              value='quimicos'
              className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
            >
              Químicos
            </TabsTrigger>
            <TabsTrigger
              value='outros'
              className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
            >
              Outros
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value='vidrarias'
            className='w-full mt-10 rounded-md border border-borderMy p-4'
          >
            <form
              onSubmit={handleSubmit(postCreateVidraria)}
              className='w-full gap-y-3 flex flex-col'
            >
              <div className='w-full h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3'>
                <InputText
                  label='Nome Completo'
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
              </div>
              <div className='flex gap-x-5'>
                <button
                  type='submit'
                  className='font-rajdhani-semibold text-primaryMy text-base bg-backgroundMy h-9 mt-8 w-full rounded-sm border border-primaryMy hover:bg-cl-table-item'
                >
                  Criar Conta
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
          <TabsContent value='quimicos'>Change your password here.</TabsContent>
          <TabsContent value='outros'>Outros.</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Launch;
