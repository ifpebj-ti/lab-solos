import { Controller, useForm, type Resolver } from 'react-hook-form';
import { toNestErrors } from '@hookform/resolvers';
import { z } from 'zod';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import InputText from '../../inputs/Text';
import SelectInput from '../../inputs/SelectInput';
import PopoverInput from '../../inputs/PopoverInput';
import DateInput from '../../inputs/DateInput';
import { categoriasQuimicas, unidadesMedida } from '@/mocks/Unidades';
import { createProduct } from '@/integration/Product';
import { toast } from '@/components/hooks/use-toast';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import {
  CIVIL_DATE_INPUT_MASK,
  formatCivilDate,
  parseCivilDateInput,
} from '@/function/date';
import {
  applyRecognizedFieldErrors,
  readProductExpiryConfirmation,
} from './formErrors';
import CreateFormActions from './CreateFormActions';

const gruposParaCadastro = categoriasQuimicas.filter(
  ({ value }) => value !== 'Indefinido'
);

const plainDigits = '0123456789';
const subscriptDigits = '₀₁₂₃₄₅₆₇₈₉';

const civilDateField = (label: string) =>
  z.string().transform((value, context) => {
    const civilDate = parseCivilDateInput(value);
    if (civilDate) {
      return civilDate;
    }

    context.addIssue({
      code: 'custom',
      message: `${label} inválida. Use ${CIVIL_DATE_INPUT_MASK}.`,
    });
    return z.NEVER;
  });

const submitCreateQuimicoSchema = z.object({
  nome: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  formula: z
    .string()
    .min(1, 'A fórmula não pode ser vazia')
    .max(50, 'A fórmula deve ter no máximo 50 caracteres')
    .regex(/^[A-Za-z0-9₀-₉()\-+,. ]+$/, 'A fórmula contém caracteres inválidos'),
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
  grupo: z.enum(
    gruposParaCadastro.map(({ value }) => value),
    'Selecione um grupo válido'
  ),
  dataFabricacao: civilDateField('Data de fabricação'),
  dataValidade: civilDateField('Data de validade'),
  marca: z.string().optional(),
  pesoMolecular: z.string().trim().superRefine((value, context) => {
    if (!value) return;

    if (!/^\d+(?:[.,]\d{1,3})?$/.test(value)) {
      context.addIssue({
        code: 'custom',
        message:
          'Informe um Peso Molecular entre 0,001 e 10.000 g/mol com até três casas decimais.',
      });
      return;
    }

    const weight = Number(value.replace(',', '.'));
    if (!Number.isFinite(weight) || weight < 0.001 || weight > 10_000) {
      context.addIssue({
        code: 'custom',
        message:
          'Informe um Peso Molecular entre 0,001 e 10.000 g/mol com até três casas decimais.',
      });
    }
  }),
});

export type CreateQuimicoFormData = z.infer<typeof submitCreateQuimicoSchema>;

const resolveQuimicoForm: Resolver<CreateQuimicoFormData> = (values, _, options) => {
  const result = submitCreateQuimicoSchema.safeParse(values);
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

const QUIMICO_ERROR_FIELDS = new Set<keyof CreateQuimicoFormData>([
  'nome',
  'formula',
  'marca',
  'grupo',
  'quantidade',
  'minimo',
  'localizacao',
  'dataFabricacao',
  'dataValidade',
  'pesoMolecular',
]);

type ProductCreationRequest = {
  nomeProduto: string;
  fornecedor?: string;
  tipo: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto?: string;
  dataFabricacao: string;
  dataValidade: string;
  dataValidadeConfirmada?: string;
  unidadeMedida?: string;
  estadoFisico?: string;
  cor?: string;
  odor?: string;
  formulaQuimica: string;
  pesoMolecular?: number;
  densidade?: number;
  grauPureza?: string;
  grupo: string;
  material?: string;
  formato?: string;
  altura?: string;
  capacidade?: number;
  graduada?: boolean;
};

type ExpirationReview = {
  data: CreateQuimicoFormData;
  formSnapshot: string;
  dataValidade: string;
  diaCivil: string;
};

const makeProductCreationRequest = (
  data: CreateQuimicoFormData,
  dataValidadeConfirmada?: string
): ProductCreationRequest => {
  const dataPost: ProductCreationRequest = {
    nomeProduto: data.nome,
    fornecedor: data.marca ?? '',
    tipo: 'Quimico',
    quantidade: data.quantidade,
    quantidadeMinima: data.minimo,
    localizacaoProduto: data.localizacao || undefined,
    dataFabricacao: data.dataFabricacao,
    dataValidade: data.dataValidade,
    ...(dataValidadeConfirmada === undefined
      ? {}
      : { dataValidadeConfirmada }),
    unidadeMedida: data.medida || undefined,
    estadoFisico: '',
    cor: '',
    odor: '',
    formulaQuimica: data.formula,
    pesoMolecular: data.pesoMolecular
      ? Number(data.pesoMolecular.replace(',', '.'))
      : undefined,
    densidade: 0,
    grauPureza: '',
    grupo: data.grupo,
    material: '',
    formato: '',
    altura: '',
    capacidade: 0,
    graduada: false,
  };

  Object.keys(dataPost).forEach((key) => {
    if ((dataPost as Record<string, unknown>)[key] === '') {
      delete (dataPost as Record<string, unknown>)[key];
    }
  });

  return dataPost;
};

function FormQuimicos() {
  const [medida, setMedida] = useState('');
  const [grupo, setGrupo] = useState('');
  const [expirationReview, setExpirationReview] =
    useState<ExpirationReview | null>(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const confirmationInFlight = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const returnFocusTarget = useRef<HTMLElement | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    setError,
    clearErrors,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuimicoFormData>({
    resolver: resolveQuimicoForm,
    defaultValues: {
      dataFabricacao: '',
      dataValidade: '',
      pesoMolecular: '',
    },
  });

  useEffect(() => {
    const subscription = watch((_values, { name }) => {
      if (name) {
        setExpirationReview((current) => (current ? null : current));
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  function formatFormulaSelection(
    event: MouseEvent<HTMLButtonElement>,
    asSubscript: boolean
  ) {
    const formula = event.currentTarget.form?.elements.namedItem('formula');
    if (!(formula instanceof HTMLInputElement)) return;

    const { value, selectionStart: start, selectionEnd: end } = formula;
    if (start === null || end === null || start === end) {
      formula.focus();
      return;
    }

    const selection = value.slice(start, end);
    const formatted = asSubscript
      ? selection.replace(/[0-9]/g, (digit) => subscriptDigits[plainDigits.indexOf(digit)])
      : selection.replace(/[₀-₉]/g, (digit) => plainDigits[subscriptDigits.indexOf(digit)]);

    setValue('formula', value.slice(0, start) + formatted + value.slice(end), {
      shouldDirty: true,
      shouldValidate: Boolean(errors.formula),
    });
    formula.focus();
    formula.setSelectionRange(start, end);
  }

  const notifyCreateFailure = (error: unknown) => {
    const presentation = notifyError(error, OPERATION_IDS.createProduct);
    applyRecognizedFieldErrors(
      presentation.fieldErrors,
      QUIMICO_ERROR_FIELDS,
      setError
    );
  };

  const finishCreation = () => {
    toast({
      title: 'Produto criado',
      description: 'Verifique o estoque para validação...',
    });
    reset();
    setMedida('');
    setGrupo('');
    setExpirationReview(null);
  };

  async function onSubmit(data: CreateQuimicoFormData) {
    clearErrors();
    const activeElement = document.activeElement;
    returnFocusTarget.current =
      activeElement instanceof HTMLElement && formRef.current?.contains(activeElement)
        ? activeElement
        : formRef.current?.querySelector<HTMLElement>('button[type="submit"]') ??
          null;
    const formSnapshot = JSON.stringify(getValues());
    try {
      await createProduct(makeProductCreationRequest(data));
      finishCreation();
    } catch (error) {
      const confirmation = readProductExpiryConfirmation(error);
      if (confirmation && confirmation.dataValidade === data.dataValidade) {
        setExpirationReview({
          data,
          formSnapshot,
          ...confirmation,
        });
        return;
      }

      notifyCreateFailure(error);
    }
  }

  async function confirmExpiredProduct() {
    const review = expirationReview;
    if (!review || confirmationInFlight.current) return;

    if (JSON.stringify(getValues()) !== review.formSnapshot) {
      setExpirationReview(null);
      return;
    }

    confirmationInFlight.current = true;
    setIsReviewSubmitting(true);
    try {
      try {
        await createProduct(makeProductCreationRequest(review.data));
        finishCreation();
        return;
      } catch (error) {
        const currentConfirmation = readProductExpiryConfirmation(error);
        if (!currentConfirmation) throw error;

        if (JSON.stringify(getValues()) !== review.formSnapshot) {
          setExpirationReview(null);
          return;
        }

        if (currentConfirmation.dataValidade !== review.dataValidade) {
          setExpirationReview(null);
          setError('dataValidade', {
            type: 'server',
            message: 'Revise a data de validade e envie novamente.',
          });
          return;
        }

        if (currentConfirmation.diaCivil !== review.diaCivil) {
          setExpirationReview({ ...review, ...currentConfirmation });
          return;
        }
      }

      await createProduct(
        makeProductCreationRequest(review.data, review.dataValidade)
      );
      finishCreation();
    } catch (error) {
      const currentConfirmation = readProductExpiryConfirmation(error);
      if (
        currentConfirmation &&
        currentConfirmation.dataValidade === review.dataValidade
      ) {
        setExpirationReview({ ...review, ...currentConfirmation });
        return;
      }

      setExpirationReview(null);
      notifyCreateFailure(error);
    } finally {
      confirmationInFlight.current = false;
      setIsReviewSubmitting(false);
    }
  }

  const resetForm = () => {
    reset();
    setMedida('');
    setGrupo('');
    setExpirationReview(null);
  };

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className='flex w-full flex-col gap-6'
      >
        <div className='grid w-full grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3'>
        <input type='hidden' {...register('grupo')} />
        <input type='hidden' {...register('medida')} />
        <InputText
          label='Nome'
          register={register}
          error={errors.nome?.message}
          name='nome'
          type='text'
          required={true}
        />
        <div>
          <InputText
            label='Fórmula Química'
            register={register}
            error={errors.formula?.message}
            name='formula'
            type='text'
            required={true}
          />
          <div className='mt-1 flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(event) => formatFormulaSelection(event, true)}
            >
              Aplicar subscrito
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(event) => formatFormulaSelection(event, false)}
            >
              Remover subscrito
            </Button>
          </div>
        </div>
        <InputText
          label='Marca'
          register={register}
          error={errors.marca?.message}
          name='marca'
          type='text'
        />
        <div className='w-full min-w-0 flex flex-col gap-1 mt-3'>
          <label
            htmlFor='pesoMolecular'
            className='font-inter-regular text-sm text-clt-2'
          >
            Peso Molecular (g/mol)
          </label>
          <input
            id='pesoMolecular'
            type='text'
            inputMode='decimal'
            placeholder='Ex.: 18,015'
            aria-invalid={Boolean(errors.pesoMolecular)}
            aria-describedby={
              errors.pesoMolecular ? 'pesoMolecular-error' : undefined
            }
            {...register('pesoMolecular')}
            className='min-h-11 w-full min-w-0 rounded-md border border-borderMy bg-surface px-3 text-base text-clt-2 shadow-xs hover:border-focus focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:text-sm'
          />
          <p
            id='pesoMolecular-error'
            role={errors.pesoMolecular ? 'alert' : undefined}
            className={`min-h-5 text-danger text-sm [overflow-wrap:anywhere] ${errors.pesoMolecular ? '' : 'sr-only'}`}
          >
            {errors.pesoMolecular?.message}
          </p>
        </div>
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
          options={gruposParaCadastro}
          onValueChange={(value) => {
            setGrupo(value);
            setValue('grupo', value);
          }}
          error={errors.grupo?.message}
          value={grupo}
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
        <Controller
          control={control}
          name='dataFabricacao'
          render={({ field: { ref, ...field } }) => (
            <DateInput
              {...field}
              inputRef={ref}
              nome='Data de Fabricação'
              error={errors.dataFabricacao?.message}
              required
            />
          )}
        />
        <Controller
          control={control}
          name='dataValidade'
          render={({ field: { ref, ...field } }) => (
            <DateInput
              {...field}
              inputRef={ref}
              nome='Data de Validade'
              error={errors.dataValidade?.message}
              required
            />
          )}
        />
        </div>
        <CreateFormActions
          isSubmitting={isSubmitting || isReviewSubmitting}
          onCancel={resetForm}
        />
      </form>
      <AlertDialog
        open={expirationReview !== null}
        onOpenChange={(open) => {
          if (!open && !isReviewSubmitting) {
            setExpirationReview(null);
            const target = returnFocusTarget.current;
            if (target) {
              window.setTimeout(() => {
                if (target.isConnected) target.focus();
              }, 0);
            }
          }
        }}
      >
        <AlertDialogContent className='max-h-[min(80vh,40rem)] w-[calc(100%-2rem)] max-w-md border-borderMy bg-surface'>
          <AlertDialogHeader>
            <AlertDialogTitle>Produto vencido</AlertDialogTitle>
            <AlertDialogDescription>
              A validade informada (
              {formatCivilDate(expirationReview?.dataValidade)}) é anterior ao
              dia civil atual (
              {formatCivilDate(expirationReview?.diaCivil)}). Deseja adicionar
              mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isReviewSubmitting}
              className='min-h-11 border-borderMy bg-surface text-clt-2 hover:bg-surface-selected'
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type='button'
              onClick={confirmExpiredProduct}
              disabled={isReviewSubmitting}
              className='min-h-11 bg-primaryMy text-white hover:bg-primaryMy/90'
            >
              {isReviewSubmitting ? 'Revalidando...' : 'Adicionar mesmo assim'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default FormQuimicos;
