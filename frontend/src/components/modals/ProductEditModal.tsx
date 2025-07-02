import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/hooks/use-toast';
import { updateProduct } from '@/integration/Product';
import { Loader2 } from 'lucide-react';

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

export default function ProductEditModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: ProductEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    catmat: '',
    nomeProduto: '',
    quantidade: '',
    quantidadeMinima: '',
    fornecedor: '',
    localizacaoProduto: '',
    dataFabricacao: '',
    dataValidade: '',
    status: '',
  });

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
    }
  }, [product, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: 'Erro ao atualizar produto',
        description:
          'Ocorreu um erro ao tentar atualizar o produto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[600px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-xl font-rajdhani-medium'>
            Editar Produto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='catmat'>CATMAT</Label>
              <Input
                id='catmat'
                name='catmat'
                value={formData.catmat}
                onChange={handleChange}
                placeholder='Código CATMAT'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='nomeProduto'>Nome do Produto</Label>
              <Input
                id='nomeProduto'
                name='nomeProduto'
                value={formData.nomeProduto}
                onChange={handleChange}
                placeholder='Nome do produto'
                required
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='quantidade'>Quantidade</Label>
              <Input
                id='quantidade'
                name='quantidade'
                type='number'
                step='0.01'
                value={formData.quantidade}
                onChange={handleChange}
                placeholder='Quantidade atual'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='quantidadeMinima'>Quantidade Mínima</Label>
              <Input
                id='quantidadeMinima'
                name='quantidadeMinima'
                type='number'
                step='0.01'
                value={formData.quantidadeMinima}
                onChange={handleChange}
                placeholder='Quantidade mínima'
                required
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='fornecedor'>Fornecedor</Label>
            <Input
              id='fornecedor'
              name='fornecedor'
              value={formData.fornecedor}
              onChange={handleChange}
              placeholder='Nome do fornecedor'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='localizacaoProduto'>Localização</Label>
            <Input
              id='localizacaoProduto'
              name='localizacaoProduto'
              value={formData.localizacaoProduto}
              onChange={handleChange}
              placeholder='Localização do produto no estoque'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='dataFabricacao'>Data de Fabricação</Label>
              <Input
                id='dataFabricacao'
                name='dataFabricacao'
                type='date'
                value={formData.dataFabricacao}
                onChange={handleChange}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='dataValidade'>Data de Validade</Label>
              <Input
                id='dataValidade'
                name='dataValidade'
                type='date'
                value={formData.dataValidade}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='status'>Status</Label>
            <Input
              id='status'
              name='status'
              value={formData.status}
              onChange={handleChange}
              placeholder='Status do produto'
            />
          </div>

          <div className='flex justify-end gap-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
