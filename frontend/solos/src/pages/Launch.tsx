import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DateInput from '@/components/global/inputs/DateInput';
import InputText from '@/components/global/inputs/Text';
import OpenSearch from '@/components/global/OpenSearch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const submitLaunchQuimicosSchema = z.object({
  catmat: z.string().min(6, 'O código CATMAT deve ter mais de 5 caracteres'),
  quantidade: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Quantidade deve ser um número inteiro positivo.',
    }),
  lote: z.string().min(5, 'O lote deve ter mais de 4 caracteres'),
  // validade: z.date(),
});

type LaunchQuimicosFormData = z.infer<typeof submitLaunchQuimicosSchema>;

function Launch() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LaunchQuimicosFormData>({
    resolver: zodResolver(submitLaunchQuimicosSchema),
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
          <OpenSearch />
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
              className='w-full gap-y-3 flex flex-col min-h-96 justify-between'
            >
              <div className='w-full h-full grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3'>
                <InputText
                  label='Catmat'
                  type='text'
                  register={register}
                  error={errors.catmat?.message}
                  name='catmat'
                />
                <InputText
                  label='Lote'
                  type='text'
                  register={register}
                  error={errors.lote?.message}
                  name='lote'
                />
                <InputText
                  label='Quantidade'
                  type='number'
                  register={register}
                  error={errors.quantidade?.message}
                  name='quantidade'
                />
                <DateInput />
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
          <TabsContent value='vidrarias'>
            Change your password here.
          </TabsContent>
          <TabsContent value='outros'>Outros.</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Launch;
