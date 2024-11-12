import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import InputText from '../../inputs/Text';
import SelectInput from '../../inputs/SelectInput';
import PopoverInput from '../../inputs/PopoverInput';
import DateInput from '../../inputs/DateInput';
import { options, unidades } from '@/mocks/Unidades';

const submitCreateQuimicoSchema = z.object({
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
  localizacao: z
    .string()
    .min(21, 'A localização deve ter mais de 20 caracteres'),
  medida: z.string().nonempty('Selecione uma unidade de medida'),
  grupo: z.string().nonempty('Selecione um grupo'),
});

type CreateQuimicoFormData = z.infer<typeof submitCreateQuimicoSchema>;

function FormQuimicos() {
  const navigate = useNavigate();
  const [medida, setMedida] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateQuimicoFormData>({
    resolver: zodResolver(submitCreateQuimicoSchema),
  });

  function onSubmit(data: CreateQuimicoFormData) {
    console.log(data); // faça a requisição de post aqui
    navigate('/');
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='w-full gap-y-3 flex flex-col'
    >
      <div className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3'>
        {/* Insira os campos específicos para químicos aqui */}
        <InputText
          label='Nome'
          register={register}
          error={errors.nome?.message}
          name='nome'
          type={'text'}
        />
        <InputText
          label='Fórmula Química'
          register={register}
          error={errors.formula?.message}
          name='formula'
          type={'text'}
        />
        <InputText
          label='Catmat'
          register={register}
          error={errors.catmat?.message}
          name='catmat'
          type={'text'}
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
          register={register}
          error={errors.lote?.message}
          name='lote'
          type={'text'}
        />
        <InputText
          label='Localização do Produto'
          register={register}
          error={errors.localizacao?.message}
          name='localizacao'
          type={'text'}
        />
        <SelectInput
          label='Grupo'
          options={options}
          onValueChange={(value) => setValue('grupo', value)}
          error={errors.grupo?.message}
          value={''}
        />
        <DateInput />
        <PopoverInput
          unidades={unidades}
          value={medida}
          onChange={(value) => {
            setMedida(value);
            setValue('medida', value);
          }}
          error={errors.medida?.message}
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
          Criar Químicos
        </button>
      </div>
    </form>
  );
}

export default FormQuimicos;
