import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import InputText from '../../inputs/Text';
import SelectInput from '../../inputs/SelectInput';
import { medidas, vidrarias } from '@/mocks/Unidades';
import PopoverInput from '../../inputs/PopoverInput';
import { useState } from 'react';

const submitCreateVidrariaSchema = z.object({
  id: z.string().min(6, 'O id deve ter pelo menos 6 caracteres'),
  nome: z.string().min(8, 'O nome deve ter pelo menos 8 caracteres'),
  tipo: z.string().nonempty('Selecione um tipo de vidraria'),
  capacidade: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Capacidade deve ser um número inteiro positivo.',
    }),
  medida: z.string().nonempty('Selecione uma unidade de medida'),
  marca: z.string().min(8, 'Marca deve ter pelo menos 8 caracteres'),
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
  localizacao: z
    .string()
    .min(10, 'A localização deve ter mais de 10 caracteres'),
  restricoes: z.string().min(10, 'Restrições deve ter mais de 10 caracteres'),
  lote: z.string().min(10, 'O lote deve ter pelo menos 8 caracteres'),
});

type CreateVidrariaFormData = z.infer<typeof submitCreateVidrariaSchema>;

function FormVidrarias() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateVidrariaFormData>({
    resolver: zodResolver(submitCreateVidrariaSchema),
  });

  function onSubmit(data: CreateVidrariaFormData) {
    console.log(data); // faça a requisição de post aqui
    navigate('/');
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='w-full gap-y-3 flex flex-col'
    >
      <div className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3'>
        <InputText
          label='ID'
          register={register}
          error={errors.id?.message}
          name='id'
          type='text'
        />
        <InputText
          label='Nome'
          register={register}
          error={errors.nome?.message}
          name='nome'
          type='text'
        />
        <InputText
          label='Capacidade'
          register={register}
          error={errors.capacidade?.message}
          name='capacidade'
          type='number'
        />
        <PopoverInput
          unidades={vidrarias}
          error={errors.tipo?.message}
          value={tipo}
          onChange={(value) => {
            setTipo(value);
            setValue('tipo', value);
          }}
          title='Selecione o Grupo Correspondente'
        />
        <InputText
          label='Marca/Fabricante'
          register={register}
          error={errors.marca?.message}
          name='marca'
          type='text'
        />
        <SelectInput
          label='Medida'
          options={medidas}
          error={errors.medida?.message}
          value=''
          onValueChange={(value) => setValue('medida', value)}
        />
        <InputText
          label='Lote'
          register={register}
          error={errors.lote?.message}
          name='lote'
          type='text'
        />
        <InputText
          label='Quantidade Inserida'
          register={register}
          error={errors.minimo?.message}
          name='minimo'
          type='number'
        />
        <InputText
          label='Quantidade Mínima'
          register={register}
          error={errors.minimo?.message}
          name='minimo'
          type='number'
        />
        <InputText
          label='Localização'
          register={register}
          error={errors.localizacao?.message}
          name='localizacao'
          type='text'
        />
        <InputText
          label='Restrições de Uso'
          register={register}
          error={errors.restricoes?.message}
          name='restricoes'
          type='text'
        />
      </div>
      <div className='flex gap-x-5'>
        <button
          type='button'
          className='font-rajdhani-semibold text-primaryMy text-base bg-backgroundMy h-9 mt-8 w-full rounded-sm border border-primaryMy hover:bg-cl-table-item'
        >
          Cancelar
        </button>
        <button
          type='submit'
          className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 mt-8 w-full rounded-sm hover:bg-opacity-90'
        >
          Adicionar Vidraria
        </button>
      </div>
    </form>
  );
}

export default FormVidrarias;
