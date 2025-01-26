import DateInput from '@/components/global/inputs/DateInput';
import InputText from '@/components/global/inputs/Text';
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

function LaunchQuimicos() {
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
  );
}

export default LaunchQuimicos;
