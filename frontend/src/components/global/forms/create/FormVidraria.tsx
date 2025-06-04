import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import InputText from '../../inputs/Text';
import { formatos, grausPureza, materiais, TrueFalse } from '@/mocks/Unidades';
import PopoverInput from '../../inputs/PopoverInput';
import { useState } from 'react';
import { createProduct } from '@/integration/Product';
import { toast } from '@/components/hooks/use-toast';

const submitCreateVidrariaSchema = z.object({
  nome: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(50, 'O nome deve ter no máximo 50 caracteres'),
  marca: z.string().optional().or(z.literal('')),
  dataFabricacao: z.string().optional().or(z.literal('')),
  dataValidade: z.string().optional().or(z.literal('')),
  quantidade: z
    .string()
    .transform((val) => (val === '' ? undefined : Number(val)))
    .refine(
      (val) =>
        val === undefined ||
        (Number.isInteger(val) && val >= 0 && val <= 10000),
      {
        message: 'Quantidade deve ser um número inteiro entre 0 e 10.000.',
      }
    )
    .optional(),
  minimo: z
    .string()
    .transform((val) => (val === '' ? undefined : Number(val)))
    .refine(
      (val) =>
        val === undefined ||
        (Number.isInteger(val) && val >= 0 && val <= 10000),
      {
        message:
          'Quantidade mínima deve ser um número inteiro entre 0 e 10.000.',
      }
    )
    .optional(),
  capacidade: z
    .string()
    .transform((val) => (val === '' ? undefined : Number(val)))
    .refine(
      (val) =>
        val === undefined || (Number.isFinite(val) && val > 0 && val <= 100000),
      {
        message: 'Capacidade deve ser um número positivo até 100.000 ml.',
      }
    )
    .optional(),
  localizacao: z.string().optional().or(z.literal('')),
  formato: z.string().optional().or(z.literal('')),
  material: z.string().optional().or(z.literal('')),
  altura: z.string().optional().or(z.literal('')),
  graduada: z.boolean().optional(),
});

export type CreateVidrariaFormData = z.infer<typeof submitCreateVidrariaSchema>;

function FormVidrarias() {
  const [formato, setFormato] = useState('');
  const [material, setMaterial] = useState('');
  const [altura, setAltura] = useState('');
  const [graduada, setGraduada] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateVidrariaFormData>({
    resolver: zodResolver(submitCreateVidrariaSchema),
  });

  async function onSubmit(data: CreateVidrariaFormData) {
    try {
      const dataPost = {
        nomeProduto: data.nome,
        fornecedor: data.marca || undefined,
        tipo: 'Vidraria',
        quantidade: data.quantidade ?? 0,
        quantidadeMinima: data.minimo ?? 0,
        localizacaoProduto: data.localizacao || undefined,
        dataFabricacao: data.dataFabricacao,
        dataValidade: data.dataValidade,
        catmat: '',
        unidadeMedida: '',
        estadoFisico: '',
        cor: '',
        odor: '',
        formulaQuimica: '',
        pesoMolecular: 0,
        densidade: 0,
        grauPureza: '',
        grupo: '',
        material: data.material || undefined,
        formato: data.formato || undefined,
        altura: data.altura || undefined,
        capacidade: data.capacidade,
        graduada: data.graduada,
      };

      const dataPostTyped: Record<string, unknown> = { ...dataPost };
      Object.keys(dataPostTyped).forEach(
        (key) => dataPostTyped[key] === '' && delete dataPostTyped[key]
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
          label='Fornecedor/Marca'
          register={register}
          error={errors.marca?.message}
          name='marca'
          type='string'
        />
        <InputText
          label='Quantidade (Un)'
          register={register}
          error={errors.quantidade?.message}
          name='quantidade'
          type='number'
          required={true}
        />
        <InputText
          label='Quantidade Mínima (Un)'
          register={register}
          error={errors.minimo?.message}
          name='minimo'
          type='number'
          required={true}
        />
        <InputText
          label='Capacidade (ml)'
          register={register}
          error={errors.capacidade?.message}
          name='capacidade'
          type='number'
          required={true}
        />
        <InputText
          label='Localização'
          register={register}
          error={errors.localizacao?.message}
          name='localizacao'
          type='text'
        />
        <PopoverInput
          unidades={formatos}
          error={errors.formato?.message}
          value={formato}
          onChange={(value) => {
            setFormato(value);
            setValue('formato', value);
          }}
          title='Formato'
        />
        <PopoverInput
          unidades={materiais}
          error={errors.material?.message}
          value={material}
          onChange={(value) => {
            setMaterial(value);
            setValue('material', value);
          }}
          title='Material'
        />
        <PopoverInput
          unidades={grausPureza}
          error={errors.altura?.message}
          value={altura}
          onChange={(value) => {
            setAltura(value);
            setValue('altura', value);
          }}
          title='Altura'
        />
        <PopoverInput
          unidades={TrueFalse}
          error={errors.graduada?.message}
          value={graduada ? 'true' : 'false'} // Transforma boolean em string para exibir corretamente
          onChange={(value) => {
            const booleanValue = value === 'true'; // Converte a string para boolean
            setGraduada(booleanValue); // Atualiza o estado corretamente
            setValue('graduada', booleanValue); // Atualiza o formulário corretamente
          }}
          title='Graduada'
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

export default FormVidrarias;
