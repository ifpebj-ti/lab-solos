import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import InputText from '../../inputs/Text';
import { createProduct } from '@/integration/Product';
import { toast } from '@/components/hooks/use-toast';
import DateInputOutros from '../../inputs/DateInputOutros';

const submitCreateOutrosSchema = z.object({
  nome: z.string().min(8, 'O nome deve ter pelo menos 8 caracteres'),
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
  dataFabricacao: z.string().date('Data de fabricação inválida'),
  dataValidade: z.string().date('Data de validade inválida'),
});

export type CreateOutrosFormData = z.infer<typeof submitCreateOutrosSchema>;

function FormOutros() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateOutrosFormData>({
    resolver: zodResolver(submitCreateOutrosSchema),
  });

  async function onSubmit(data: CreateOutrosFormData) {
    try {
      const dataPost = {
        nomeProduto: data.nome,
        fornecedor: data.marca,
        tipo: 'Outro',
        quantidade: data.quantidade,
        quantidadeMinima: data.minimo,
        localizacaoProduto: data.localizacao,
        dataFabricacao: data.dataFabricacao, // Já vem no formato ISO (yyyy-MM-dd)
        dataValidade: data.dataValidade, // Já vem no formato ISO (yyyy-MM-dd)
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
        />
        <InputText
          label='Fornecedor'
          register={register}
          error={errors.marca?.message}
          name='marca'
          type='text'
        />
        <InputText
          label='Quantidade Inserida'
          register={register}
          error={errors.quantidade?.message}
          name='quantidade'
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

        {/* Corrigimos a tipagem de `setValue` */}
        <DateInputOutros
          nome='Data de Fabricação'
          name='dataFabricacao'
          setValue={setValue}
          error={errors.dataFabricacao?.message}
          disabled={false}
        />
        <DateInputOutros
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
          Adicionar Bens
        </button>
      </div>
    </form>
  );
}

export default FormOutros;
