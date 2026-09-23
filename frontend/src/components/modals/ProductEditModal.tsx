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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role='alert' className='text-sm text-danger [overflow-wrap:anywhere]'>
      {message}
    </p>
  );
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
      // Preparar as operações JSON Patch apenas para os campos alterados
      const operations: Array<{
        op: 'replace';
        path: string;
        value: string | number;
      }> = [];

      if (formData.catmat !== (product?.catmat || '')) {
        operations.push({
          op: 'replace',
          path: '/catmat',
          value: formData.catmat,
        });
      }

      if (formData.nomeProduto !== (product?.nomeProduto || '')) {
        operations.push({
          op: 'replace',
          path: '/nomeProduto',
          value: formData.nomeProduto,
        });
      }

      if (formData.quantidade !== (product?.quantidade?.toString() || '')) {
        operations.push({
          op: 'replace',
          path: '/quantidade',
          value: parseFloat(formData.quantidade),
        });
      }

      if (
        formData.quantidadeMinima !==
        (product?.quantidadeMinima?.toString() || '')
      ) {
        operations.push({
          op: 'replace',
          path: '/quantidadeMinima',
          value: parseFloat(formData.quantidadeMinima),
        });
      }

      if (formData.fornecedor !== (product?.fornecedor || '')) {
        operations.push({
          op: 'replace',
          path: '/fornecedor',
          value: formData.fornecedor,
        });
      }

      if (formData.localizacaoProduto !== (product?.localizacaoProduto || '')) {
        operations.push({
          op: 'replace',
          path: '/localizacaoProduto',
          value: formData.localizacaoProduto,
        });
      }

      if (
        formData.dataFabricacao !==
        (product?.dataFabricacao ? product.dataFabricacao.split('T')[0] : '')
      ) {
        operations.push({
          op: 'replace',
          path: '/dataFabricacao',
          value: formData.dataFabricacao,
        });
      }

      if (
        formData.dataValidade !==
        (product?.dataValidade ? product.dataValidade.split('T')[0] : '')
      ) {
        operations.push({
          op: 'replace',
          path: '/dataValidade',
          value: formData.dataValidade,
        });
      }

      if (
        formData.status !==
        (typeof product?.status === 'number'
          ? product.status.toString()
          : product?.status || '')
      ) {
        operations.push({
          op: 'replace',
          path: '/status',
          value: formData.status,
        });
      }

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
                aria-invalid={Boolean(fieldErrors.catmat)}
                aria-describedby={fieldErrors.catmat ? 'catmat-error' : undefined}
                className={fieldErrors.catmat ? 'border-danger' : undefined}
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
                aria-invalid={Boolean(fieldErrors.nomeProduto)}
                aria-describedby={fieldErrors.nomeProduto ? 'nomeProduto-error' : undefined}
                className={fieldErrors.nomeProduto ? 'border-danger' : undefined}
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
                aria-invalid={Boolean(fieldErrors.quantidade)}
                aria-describedby={fieldErrors.quantidade ? 'quantidade-error' : undefined}
                className={fieldErrors.quantidade ? 'border-danger' : undefined}
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
                aria-invalid={Boolean(fieldErrors.quantidadeMinima)}
                aria-describedby={fieldErrors.quantidadeMinima ? 'quantidadeMinima-error' : undefined}
                className={fieldErrors.quantidadeMinima ? 'border-danger' : undefined}
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
              aria-invalid={Boolean(fieldErrors.fornecedor)}
              aria-describedby={fieldErrors.fornecedor ? 'fornecedor-error' : undefined}
              className={fieldErrors.fornecedor ? 'border-danger' : undefined}
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
              aria-invalid={Boolean(fieldErrors.localizacaoProduto)}
              aria-describedby={fieldErrors.localizacaoProduto ? 'localizacaoProduto-error' : undefined}
              className={fieldErrors.localizacaoProduto ? 'border-danger' : undefined}
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
                aria-invalid={Boolean(fieldErrors.dataFabricacao)}
                aria-describedby={fieldErrors.dataFabricacao ? 'dataFabricacao-error' : undefined}
                className={fieldErrors.dataFabricacao ? 'border-danger' : undefined}
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
                aria-invalid={Boolean(fieldErrors.dataValidade)}
                aria-describedby={fieldErrors.dataValidade ? 'dataValidade-error' : undefined}
                className={fieldErrors.dataValidade ? 'border-danger' : undefined}
              />
            </div>
          </div>

          <div className='min-w-0 space-y-2'>
            <FieldError id='status-error' message={fieldErrors.status} />
            <Label htmlFor='status'>Status</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger
                id='status'
                aria-invalid={Boolean(fieldErrors.status)}
                aria-describedby={fieldErrors.status ? 'status-error' : undefined}
                className={fieldErrors.status ? 'border-danger' : undefined}
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
