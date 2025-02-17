import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import InputText from '../../inputs/Text';
import SelectInput from '../../inputs/SelectInput';
import PopoverInput from '../../inputs/PopoverInput';
import DateInput from '../../inputs/DateInput';
import { categoriasQuimicas, unidadesMedida } from '@/mocks/Unidades';
import { createProduct } from '@/integration/Product';
import { toast } from '@/components/hooks/use-toast';

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
  localizacao: z
    .string()
    .min(21, 'A localização deve ter mais de 20 caracteres'),
  medida: z.string().nonempty('Selecione uma unidade de medida'),
  grupo: z.string().nonempty('Selecione um grupo'),
  dataFabricacao: z.string().date('Data de fabricação inválida'),
  dataValidade: z.string().date('Data de validade inválida'),
  marca: z.string().min(8, 'Marca deve ter pelo menos 8 caracteres'),
});

export type CreateQuimicoFormData = z.infer<typeof submitCreateQuimicoSchema>;

function FormQuimicos() {
  const [medida, setMedida] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateQuimicoFormData>({
    resolver: zodResolver(submitCreateQuimicoSchema),
  });

  async function onSubmit(data: CreateQuimicoFormData) {
    try {
      const dataPost = {
        nomeProduto: data.nome,
        fornecedor: data.marca,
        tipo: 'Quimico',
        quantidade: data.quantidade,
        quantidadeMinima: data.minimo,
        localizacaoProduto: data.localizacao,
        dataFabricacao: data.dataFabricacao, // Já vem no formato ISO (yyyy-MM-dd)
        dataValidade: data.dataValidade, // Já vem no formato ISO (yyyy-MM-dd)
        catmat: data.catmat,
        unidadeMedida: data.medida,
        estadoFisico: '',
        cor: '',
        odor: '',
        formulaQuimica: data.formula,
        pesoMolecular: 0,
        densidade: 0,
        grauPureza: '',
        grupo: data.grupo,
        material: '',
        formato: '',
        altura: '',
        capacidade: 0,
        graduada: false,
      };

      await createProduct(dataPost);
      toast({
        title: 'Produto criado',
        description: 'Verifique o estoque para validação...',
      });
      reset();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao buscar dados de empréstimos:', error);
      }
      toast({
        title: 'Erro ao criar produto',
        description: 'Verifique os dados e tente novamente...',
      });
      console.error('Erro ao adicionar produto:', error);
    }
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
          label='Fornecedor'
          register={register}
          error={errors.marca?.message}
          name='marca'
          type='text'
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
          label='Localização do Produto'
          register={register}
          error={errors.localizacao?.message}
          name='localizacao'
          type={'text'}
        />
        <SelectInput
          label='Grupo'
          options={categoriasQuimicas}
          onValueChange={(value) => setValue('grupo', value)}
          error={errors.grupo?.message}
          value={''}
        />
        <PopoverInput
          unidades={unidadesMedida}
          value={medida}
          onChange={(value) => {
            setMedida(value);
            setValue('medida', value);
          }}
          error={errors.medida?.message}
        />
        <DateInput
          nome='Data de Fabricação'
          name='dataFabricacao'
          setValue={setValue}
          error={errors.dataFabricacao?.message}
          disabled={false}
        />
        <DateInput
          nome='Data de Validade'
          name='dataValidade'
          setValue={setValue}
          error={errors.dataValidade?.message}
          disabled={true}
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
