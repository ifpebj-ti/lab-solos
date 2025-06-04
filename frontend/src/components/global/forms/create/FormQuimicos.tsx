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
  nome: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  formula: z
    .string()
    .min(1, 'A fórmula não pode ser vazia')
    .max(50, 'A fórmula deve ter no máximo 50 caracteres')
    .regex(/^[A-Za-z0-9()\-+,. ]+$/, 'A fórmula contém caracteres inválidos'),
  catmat: z.string().optional().or(z.literal('')),
  quantidade: z.preprocess(
    (val) => Number(val),
    z.number().int().positive('Quantidade deve ser um número inteiro positivo.')
  ),
  minimo: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0, 'Quantidade mínima não pode ser negativa')
  ),
  localizacao: z.string().optional().or(z.literal('')),
  medida: z.string().nonempty('Selecione uma unidade de medida'),
  grupo: z.string().nonempty('Selecione um grupo'),
  dataFabricacao: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data de fabricação inválida'),
  dataValidade: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data de validade inválida'),
  marca: z.string().optional().or(z.literal('')),
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
      type DataPost = {
        nomeProduto: string;
        fornecedor?: string;
        tipo: string;
        quantidade: number;
        quantidadeMinima: number;
        localizacaoProduto?: string;
        dataFabricacao: string;
        dataValidade: string;
        catmat?: string;
        unidadeMedida?: string;
        estadoFisico?: string;
        cor?: string;
        odor?: string;
        formulaQuimica: string;
        pesoMolecular?: number;
        densidade?: number;
        grauPureza?: string;
        grupo?: string;
        material?: string;
        formato?: string;
        altura?: string;
        capacidade?: number;
        graduada?: boolean;
      };

      const dataPost: DataPost = {
        nomeProduto: data.nome,
        fornecedor: data.marca ?? '', // Always a string
        tipo: 'Quimico',
        quantidade: data.quantidade,
        quantidadeMinima: data.minimo,
        localizacaoProduto: data.localizacao || undefined,
        dataFabricacao: data.dataFabricacao,
        dataValidade: data.dataValidade,
        catmat: data.catmat || undefined,
        unidadeMedida: data.medida || undefined,
        estadoFisico: '',
        cor: '',
        odor: '',
        formulaQuimica: data.formula,
        pesoMolecular: 0,
        densidade: 0,
        grauPureza: '',
        grupo: data.grupo || undefined,
        material: '',
        formato: '',
        altura: '',
        capacidade: 0,
        graduada: false,
      };

      // Garantir que fornecedor é sempre string
      (dataPost as { fornecedor: string }).fornecedor =
        dataPost.fornecedor ?? '';

      // Remove campos não obrigatórios se estiverem vazios ou undefined
      Object.keys(dataPost).forEach(
        (key) =>
          (dataPost as Record<string, unknown>)[key] === '' &&
          delete (dataPost as Record<string, unknown>)[key]
      );

      await createProduct(dataPost);
      toast({
        title: 'Produto criado',
        description: 'Verifique o estoque para validação...',
      });
      reset();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Erro ao buscar dados de empréstimos:', error);
      }
      toast({
        title: 'Erro ao criar produto',
        description: 'Verifique os dados e tente novamente...',
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='w-full gap-y-3 flex flex-col'
    >
      <div className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3'>
        <InputText
          label='Nome'
          register={register}
          error={errors.nome?.message}
          name='nome'
          type='text'
          required={true}
        />
        <InputText
          label='Fórmula Química'
          register={register}
          error={errors.formula?.message}
          name='formula'
          type='text'
          required={true}
        />
        <InputText
          label='Catmat'
          register={register}
          error={errors.catmat?.message}
          name='catmat'
          type='text'
          required={false}
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
          required={true}
        />
        <InputText
          label='Quantidade Mínima'
          type='number'
          register={register}
          error={errors.minimo?.message}
          name='minimo'
          required={true}
        />
        <InputText
          label='Localização do Produto'
          register={register}
          error={errors.localizacao?.message}
          name='localizacao'
          type='text'
        />
        <SelectInput
          label='Grupo'
          options={categoriasQuimicas}
          onValueChange={(value) => setValue('grupo', value)}
          error={errors.grupo?.message}
          value={''}
          required={true}
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
          required={true}
        />
        <DateInput
          nome='Data de Validade'
          name='dataValidade'
          setValue={setValue}
          error={errors.dataValidade?.message}
          disabled={true}
          required={true}
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
          Adicionar
        </button>
      </div>
    </form>
  );
}

export default FormQuimicos;
