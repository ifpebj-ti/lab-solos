import { useForm, Controller } from 'react-hook-form';
import { toNestErrors } from '@hookform/resolvers';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import { parseISO } from 'date-fns';
import InputText from '../../inputs/Text';
import { createProduct } from '@/integration/Product';
import { toast } from '@/components/hooks/use-toast';
import DateInput from '../../inputs/DateInput';
import { CIVIL_DATE_INPUT_MASK, parseCivilDateInput } from '@/function/date';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import { applyRecognizedFieldErrors } from './formErrors';
import CreateFormActions from './CreateFormActions';

const civilDateField = (label: string, allowPastDates = true) =>
  z.string().transform((value, context) => {
    const civilDate = parseCivilDateInput(value);
    if (!civilDate) {
      context.addIssue({
        code: 'custom',
        message: `${label} inválida. Use ${CIVIL_DATE_INPUT_MASK}.`,
      });
      return z.NEVER;
    }

    if (!allowPastDates && parseISO(civilDate).getTime() < Date.now()) {
      context.addIssue({
        code: 'custom',
        message: `${label} não pode ser anterior à data atual.`,
      });
      return z.NEVER;
    }

    return civilDate;
  });

const submitCreateOutrosSchema = z.object({
  nome: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  marca: z.string().optional().or(z.literal('')),
  quantidade: z
    .string()
    .refine((val) => /^\d+$/.test(val), {
      message: 'Quantidade deve ser um número inteiro positivo.',
    })
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0 && val <= 100000, {
      message: 'Quantidade deve ser um número inteiro positivo até 100.000.',
    }),
  minimo: z
    .string()
    .refine((val) => /^\d+$/.test(val), {
      message: 'Quantidade mínima deve ser um número inteiro positivo.',
    })
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val >= 0 && val <= 100000, {
      message:
        'Quantidade mínima deve ser um número inteiro entre 0 e 100.000.',
    }),
  localizacao: z.string().optional().or(z.literal('')),
  dataFabricacao: civilDateField('Data de fabricação'),
  dataValidade: civilDateField('Data de validade', false),
});

export type CreateOutrosFormData = z.output<typeof submitCreateOutrosSchema>;

const resolveOutrosForm: Resolver<CreateOutrosFormData> = (values, _, options) => {
  const result = submitCreateOutrosSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const { fieldErrors } = z.flattenError(result.error);
  const errors = Object.fromEntries(
    Object.entries(fieldErrors).map(([name, messages]) => [
      name,
      { type: 'validation', message: messages[0] },
    ])
  );
  return { values: {}, errors: toNestErrors(errors, options) };
};

const OUTROS_ERROR_FIELDS = new Set<keyof CreateOutrosFormData>([
  'nome',
  'marca',
  'quantidade',
  'minimo',
  'localizacao',
  'dataFabricacao',
  'dataValidade',
]);

function FormOutros() {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateOutrosFormData>({
    resolver: resolveOutrosForm,
    defaultValues: {
      dataFabricacao: '',
      dataValidade: '',
    },
  });

  async function onSubmit(data: CreateOutrosFormData) {
    clearErrors();
    try {
      const dataPost = {
        nomeProduto: data.nome,
        fornecedor: data.marca || undefined,
        tipo: 'Outro',
        quantidade: data.quantidade,
        quantidadeMinima: data.minimo,
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
        material: '',
        formato: '',
        altura: '',
        capacidade: 0,
        graduada: false,
      };

      Object.keys(dataPost as Record<string, unknown>).forEach(
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
      const presentation = notifyError(error, OPERATION_IDS.createProduct);
      applyRecognizedFieldErrors(
        presentation.fieldErrors,
        OUTROS_ERROR_FIELDS,
        setError
      );
    }
  }

  const resetForm = () => reset();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex w-full flex-col gap-6'
    >
      <div className='grid w-full grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3'>
        <InputText
          label='Nome'
          register={register}
          error={errors.nome?.message}
          name='nome'
          type='text'
          required={true}
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
          register={register}
          error={errors.quantidade?.message}
          name='quantidade'
          type='number'
          required={true}
        />
        <InputText
          label='Quantidade Mínima'
          register={register}
          error={errors.minimo?.message}
          name='minimo'
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

        <Controller
          control={control}
          name='dataFabricacao'
          render={({ field }) => (
            <DateInput
              nome='Data de Fabricação'
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={errors.dataFabricacao?.message}
              required
            />
          )}
        />
        <Controller
          control={control}
          name='dataValidade'
          render={({ field }) => (
            <DateInput
              nome='Data de Validade'
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={errors.dataValidade?.message}
              required
              isDateDisabled={(date) => date < new Date()}
            />
          )}
        />
      </div>

      <CreateFormActions isSubmitting={isSubmitting} onCancel={resetForm} />
    </form>
  );
}

export default FormOutros;
