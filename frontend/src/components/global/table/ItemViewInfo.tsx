import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MailIcon, PhoneIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';

interface IItemViewInfo {
  nomeLaboratorio: string;
  localizacao: string;
  data: string;
  responsavel: string;
  quantidade: string;
  produto: string;
  motivo: string;
  ativo: boolean;
}
function ItemViewInfo({
  nomeLaboratorio,
  localizacao,
  data,
  responsavel,
  quantidade,
  produto,
  motivo,
  ativo,
}: IItemViewInfo) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Detecta o clique fora do diálogo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <ResponsiveRecord className='border border-borderMy shadow-md cursor-pointer hover:bg-cl-table-item'>
          <ResponsiveCell columnKey='laboratory'>{nomeLaboratorio}</ResponsiveCell>
          <ResponsiveCell columnKey='date'>{data}</ResponsiveCell>
          <ResponsiveCell columnKey='type'>
            <span className={`inline-flex min-h-8 w-full min-w-0 max-w-full items-center justify-center rounded-md px-0 font-inter-medium text-white [overflow-wrap:anywhere] lg:px-4 ${ativo ? 'bg-primaryMy' : 'bg-danger'}`}>
              {ativo ? 'Oferta' : 'Pedido'}
            </span>
          </ResponsiveCell>
          <ResponsiveCell columnKey='location'>{localizacao}</ResponsiveCell>
          <ResponsiveCell columnKey='responsible'>{responsavel}</ResponsiveCell>
          <ResponsiveCell columnKey='product'>{produto}</ResponsiveCell>
          <ResponsiveCell columnKey='quantity'>{quantidade}</ResponsiveCell>
          <ResponsiveCell columnKey='reason'>{motivo}</ResponsiveCell>
        </ResponsiveRecord>
      </AlertDialogTrigger>
      <AlertDialogContent
        ref={dialogRef}
        className='border border-borderMy max-w-96'
      >
        <AlertDialogHeader>
          <AlertDialogTitle className='font-inter-light px-4 py-1 mt-1'>
            Contato com o Laboratório
          </AlertDialogTitle>
          <div className='w-full h-[1px] bg-borderMy'></div>
        </AlertDialogHeader>
        <AlertDialogDescription className='flex flex-col font-inter-regular'>
          <div className='px-4 text-sm'>
            Caso deseje entrar em contato com o laboratório a respeito do
            produto '{produto}', siga os meios abaixo. Ressaltamos que não nos
            responsabilizamos por nenhum trâmite de transação.
          </div>
          <div className='flex flex-col px-4 mt-4 mb-5 gap-y-3'>
            <div className='flex gap-x-3'>
              <MailIcon width={20} height={20} stroke='#16a34a' />
              <p>{nomeLaboratorio}</p>
            </div>
            <div className='flex gap-x-3'>
              <PhoneIcon width={20} height={20} stroke='#16a34a' />
              <p>{localizacao}</p>
            </div>
          </div>
          <div></div>
        </AlertDialogDescription>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ItemViewInfo;
