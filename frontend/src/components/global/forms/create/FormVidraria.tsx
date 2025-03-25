import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import InputText from '../../inputs/Text';
import { formatos, grausPureza, materiais, TrueFalse } from '@/mocks/Unidades';
import PopoverInput from '../../inputs/PopoverInput';
import { useState } from 'react';
import { createProduct } from '@/integration/Product';
import { toast } from '@/components/hooks/use-toast';
import DateInputVd from '../../inputs/DateInputVidraria';

const submitCreateVidrariaSchema = z.object({
  nome: z.string().min(8, 'O nome deve ter pelo menos 8 caracteres'),
  marca: z.string().min(8, 'Fornecedor/Marca deve ter pelo menos 8 caracteres'),
  dataFabricacao: z.string().date('Data de fabricação inválida'),
  dataValidade: z.string().date('Data de validade inválida'),
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
  capacidade: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Capacidade deve ser um número inteiro positivo.',
    }),
  localizacao: z
    .string()
    .min(10, 'A localização deve ter mais de 10 caracteres'),
  formato: z.string().nonempty('Selecione um formato de vidraria'),
  material: z.string().nonempty('Selecione um material de vidraria'),
  altura: z.string().nonempty('Selecione um altura de vidraria'),
  graduada: z.boolean(),
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
        fornecedor: data.marca,
        tipo: 'Vidraria',
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
        material: data.material,
        formato: data.formato,
        altura: data.altura,
        capacidade: data.capacidade,
        graduada: data.graduada,
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
          label='Fornecedor/Marca'
          register={register}
          error={errors.marca?.message}
          name='marca'
          type='string'
        />
        <InputText
          label='Quantidade Inserida (Un)'
          register={register}
          error={errors.quantidade?.message}
          name='quantidade'
          type='number'
        />
        <InputText
          label='Quantidade Mínima (Un)'
          register={register}
          error={errors.minimo?.message}
          name='minimo'
          type='number'
        />
        <DateInputVd
          nome='Data de Fabricação'
          name='dataFabricacao'
          setValue={setValue}
          error={errors.dataFabricacao?.message}
          disabled={false}
        />
        <DateInputVd
          nome='Data de Validade'
          name='dataValidade'
          setValue={setValue}
          error={errors.dataValidade?.message}
          disabled={true}
        />
        <InputText
          label='Capacidade (ml)'
          register={register}
          error={errors.capacidade?.message}
          name='capacidade'
          type='number'
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
          Adicionar Vidraria
        </button>
      </div>
    </form>
  );
}

export default FormVidrarias;
