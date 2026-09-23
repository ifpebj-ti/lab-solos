import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/hooks/use-toast';
import { updateProduct } from '@/integration/Product';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import { Loader2 } from 'lucide-react';

// Opções de status do produto
const statusOptions = [
  {
    value: 'Disponivel',
    label: 'Disponível',
  },
  {
    value: 'EmUso',
    label: 'Em Uso',
  },
  {
    value: 'Danificado',
    label: 'Danificado',
  },
  {
    value: 'Emprestado',
    label: 'Emprestado',
  },
  {
    value: 'Esgotado',
    label: 'Esgotado',
  },
  {
    value: 'Vencido',
    label: 'Vencido',
  },
  {
    value: 'Perdido',
    label: 'Perdido',
  },
];

interface Product {
  id: number;
  catmat?: string;
  nomeProduto?: string;
  quantidade?: number;
  quantidadeMinima?: number;
  fornecedor?: string;
  localizacaoProduto?: string;
  dataFabricacao?: string | null;
  dataValidade?: string;
  status?: string | number;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSuccess?: () => void;
}

const EMPTY_FORM_DATA = {
  catmat: '',
  nomeProduto: '',
  quantidade: '',
  quantidadeMinima: '',
  fornecedor: '',
  localizacaoProduto: '',
  dataFabricacao: '',
  dataValidade: '',
  status: '',
};

type EditableField = keyof typeof EMPTY_FORM_DATA;
type FieldErrors = Partial<Record<EditableField, string>>;
type ProductPatchOperation = {
  op: 'replace';
  path: string;
  value: string | number;
};

const SERVER_FIELD_ALIASES: Readonly<Record<string, EditableField>> = {
  catmat: 'catmat',
  nome: 'nomeProduto',
  nomeProduto: 'nomeProduto',
  quantidade: 'quantidade',
  minimo: 'quantidadeMinima',
  quantidadeMinima: 'quantidadeMinima',
  marca: 'fornecedor',
  fornecedor: 'fornecedor',
  localizacao: 'localizacaoProduto',
  localizacaoProduto: 'localizacaoProduto',
  dataFabricacao: 'dataFabricacao',
  dataValidade: 'dataValidade',
  status: 'status',
};

function buildProductPatch(
  formData: typeof EMPTY_FORM_DATA,
  product: Product
): ProductPatchOperation[] {
  const fields: Array<[string, string, string]> = [
    [formData.catmat, product.catmat || '', '/catmat'],
    [formData.nomeProduto, product.nomeProduto || '', '/nomeProduto'],
    [formData.quantidade, product.quantidade?.toString() || '', '/quantidade'],
    [
      formData.quantidadeMinima,
      product.quantidadeMinima?.toString() || '',
      '/quantidadeMinima',
    ],
    [formData.fornecedor, product.fornecedor || '', '/fornecedor'],
    [
      formData.localizacaoProduto,
      product.localizacaoProduto || '',
      '/localizacaoProduto',
    ],
    [
      formData.dataFabricacao,
      product.dataFabricacao?.split('T')[0] || '',
      '/dataFabricacao',
    ],
    [
      formData.dataValidade,
      product.dataValidade?.split('T')[0] || '',
      '/dataValidade',
    ],
    [
      formData.status,
      typeof product.status === 'number'
        ? product.status.toString()
        : product.status || '',
      '/status',
    ],
  ];
  const numericPaths = new Set(['/quantidade', '/quantidadeMinima']);

  return fields.flatMap(([value, originalValue, path]) => {
    if (value === originalValue) return [];
    return [
      {
        op: 'replace' as const,
        path,
        value: numericPaths.has(path) ? parseFloat(value) : value,
      },
    ];
  });
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role='alert' className='text-sm text-danger [overflow-wrap:anywhere]'>
      {message}
    </p>
  );
}

function fieldFeedbackProps(field: EditableField, errors: FieldErrors) {
  const message = errors[field];
  return {
    'aria-invalid': Boolean(message),
    'aria-describedby': message ? `${field}-error` : undefined,
    className: message ? 'border-danger' : undefined,
  };
}

export default function ProductEditModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: ProductEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        catmat: product.catmat || '',
        nomeProduto: product.nomeProduto || '',
        quantidade: product.quantidade?.toString() || '',
        quantidadeMinima: product.quantidadeMinima?.toString() || '',
        fornecedor: product.fornecedor || '',
        localizacaoProduto: product.localizacaoProduto || '',
        dataFabricacao: product.dataFabricacao
          ? product.dataFabricacao.split('T')[0]
          : '',
        dataValidade: product.dataValidade
          ? product.dataValidade.split('T')[0]
          : '',
        status:
          typeof product.status === 'number'
            ? product.status.toString()
            : product.status || '',
      });
      setFieldErrors({});
    }
  }, [product, isOpen]);

  const setFieldValue = (field: EditableField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFieldValue(name as EditableField, value);
  };

  const handleStatusChange = (value: string) => {
    setFieldValue('status', value);
  };

  const validateFormData = (): FieldErrors => {
    const errors: FieldErrors = {};
    const quantidade = Number(formData.quantidade);
    const quantidadeMinima = Number(formData.quantidadeMinima);

    if (!formData.nomeProduto.trim()) {
      errors.nomeProduto = 'Informe o nome do produto.';
    }
    if (!formData.quantidade || !Number.isFinite(quantidade) || quantidade < 0) {
      errors.quantidade = 'Informe uma quantidade vÃ¡lida.';
    }
    if (
      !formData.quantidadeMinima ||
      !Number.isFinite(quantidadeMinima) ||
      quantidadeMinima < 0
    ) {
      errors.quantidadeMinima = 'Informe uma quantidade mÃ­nima vÃ¡lida.';
    }

    return errors;
  };

  const applyServerFieldErrors = (
    errors: ReturnType<typeof notifyError>['fieldErrors']
  ) => {
    const mapped: FieldErrors = {};
    for (const [sourceField, messages] of Object.entries(errors ?? {})) {
      const field = SERVER_FIELD_ALIASES[sourceField];
      const message = messages[0];
      if (field && message) mapped[field] = message;
    }
    if (Object.keys(mapped).length > 0) setFieldErrors(mapped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateFormData();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const firstField = Object.keys(validationErrors)[0];
      window.requestAnimationFrame(() => {
        document.getElementById(firstField)?.focus();
      });
      return;
    }

    setIsLoading(true);

    try {
      const operations = buildProductPatch(formData, product);

      // Verificar se há alguma alteração
      if (operations.length === 0) {
        toast({
          title: 'Nenhuma alteração detectada',
          description: 'Não foram encontradas alterações para salvar.',
          variant: 'destructive',
        });
        return;
      }

      await updateProduct({
        id: product.id,
        operations,
      });

      toast({
        title: 'Produto atualizado',
        description: 'As informações do produto foram atualizadas com sucesso.',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      const presentation = notifyError(error, OPERATION_IDS.updateProduct);
      applyServerFieldErrors(presentation.fieldErrors);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-h-[min(90vh,52rem)] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto p-4 sm:w-[calc(100%-2rem)] sm:p-6'>
        <DialogHeader>
          <DialogTitle className='pr-8 text-xl font-rajdhani-medium leading-tight'>
            Editar Produto
          </DialogTitle>
          <DialogDescription>
            Atualize os dados do material. Os valores permanecem no formulário se o salvamento falhar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='min-w-0 space-y-2'>
              <FieldError id='catmat-error' message={fieldErrors.catmat} />
              <Label htmlFor='catmat'>CATMAT</Label>
              <Input
                id='catmat'
                name='catmat'
                value={formData.catmat}
                onChange={handleChange}
                {...fieldFeedbackProps('catmat', fieldErrors)}
                placeholder='Código CATMAT'
              />
            </div>

            <div className='min-w-0 space-y-2'>
              <FieldError id='nomeProduto-error' message={fieldErrors.nomeProduto} />
              <Label htmlFor='nomeProduto'>Nome do Produto</Label>
              <Input
                id='nomeProduto'
                name='nomeProduto'
                value={formData.nomeProduto}
                onChange={handleChange}
                {...fieldFeedbackProps('nomeProduto', fieldErrors)}
                placeholder='Nome do produto'
                required
              />
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='min-w-0 space-y-2'>
              <FieldError id='quantidade-error' message={fieldErrors.quantidade} />
              <Label htmlFor='quantidade'>Quantidade</Label>
              <Input
                id='quantidade'
                name='quantidade'
                type='number'
                step='0.01'
                value={formData.quantidade}
                onChange={handleChange}
                {...fieldFeedbackProps('quantidade', fieldErrors)}
                placeholder='Quantidade atual'
                required
              />
            </div>

            <div className='min-w-0 space-y-2'>
              <Label htmlFor='quantidadeMinima'>Quantidade Mínima</Label>
              <FieldError id='quantidadeMinima-error' message={fieldErrors.quantidadeMinima} />
              <Input
                id='quantidadeMinima'
                name='quantidadeMinima'
                type='number'
                step='0.01'
                value={formData.quantidadeMinima}
                onChange={handleChange}
                {...fieldFeedbackProps('quantidadeMinima', fieldErrors)}
                placeholder='Quantidade mínima'
                required
              />
            </div>
          </div>

          <div className='min-w-0 space-y-2'>
            <FieldError id='fornecedor-error' message={fieldErrors.fornecedor} />
            <Label htmlFor='fornecedor'>Fornecedor</Label>
            <Input
              id='fornecedor'
              name='fornecedor'
              value={formData.fornecedor}
              onChange={handleChange}
              {...fieldFeedbackProps('fornecedor', fieldErrors)}
              placeholder='Nome do fornecedor'
            />
          </div>

          <div className='min-w-0 space-y-2'>
            <Label htmlFor='localizacaoProduto'>Localização</Label>
            <FieldError id='localizacaoProduto-error' message={fieldErrors.localizacaoProduto} />
            <Input
              id='localizacaoProduto'
              name='localizacaoProduto'
              value={formData.localizacaoProduto}
              onChange={handleChange}
              {...fieldFeedbackProps('localizacaoProduto', fieldErrors)}
              placeholder='Localização do produto no estoque'
            />
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='min-w-0 space-y-2'>
              <Label htmlFor='dataFabricacao'>Data de Fabricação</Label>
              <FieldError id='dataFabricacao-error' message={fieldErrors.dataFabricacao} />
              <Input
                id='dataFabricacao'
                name='dataFabricacao'
                type='date'
                value={formData.dataFabricacao}
                onChange={handleChange}
                {...fieldFeedbackProps('dataFabricacao', fieldErrors)}
              />
            </div>

            <div className='min-w-0 space-y-2'>
              <Label htmlFor='dataValidade'>Data de Validade</Label>
              <FieldError id='dataValidade-error' message={fieldErrors.dataValidade} />
              <Input
                id='dataValidade'
                name='dataValidade'
                type='date'
                value={formData.dataValidade}
                onChange={handleChange}
                {...fieldFeedbackProps('dataValidade', fieldErrors)}
              />
            </div>
          </div>

          <div className='min-w-0 space-y-2'>
            <FieldError id='status-error' message={fieldErrors.status} />
            <Label htmlFor='status'>Status</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger
                id='status'
                {...fieldFeedbackProps('status', fieldErrors)}
              >
                <SelectValue placeholder='Selecione o status' />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={isLoading}
                  >
                    <div className='flex flex-col'>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col-reverse gap-3 border-t border-borderMy pt-4 sm:flex-row sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isLoading}
              className='min-h-11 w-full sm:w-auto'
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={isLoading} className='min-h-11 w-full sm:w-auto'>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
