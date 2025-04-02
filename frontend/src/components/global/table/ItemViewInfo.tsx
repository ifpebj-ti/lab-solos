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
        <div className='w-full min-h-9 border border-borderMy rounded-md shadow-md flex flex-col items-center justify-center px-3 pt-2 text-sm  mb-5 hover:scale-customScale hover:bg-cl-table-item cursor-pointer'>
          <div className='flex flex-col items-center justify-center w-full'>
            <div className='w-full min-h-9 flex items-center justify-between'>
              <div className='w-1/2 h-full border-b border-borderMy flex'>
                <div className='w-44 h-full flex items-center font-inter-medium pb-2'>
                  Laboratório:
                </div>
                <div className='w-full h-full font-inter-regular truncate'>
                  {nomeLaboratorio}
                </div>
              </div>
              <div className='flex items-center justify-between w-1/2 h-full gap-x-4'>
                <div className='w-full h-full flex items-center justify-center border-b border-borderMy'>
                  <div className='w-44 font-inter-medium pb-2'>Data:</div>
                  <div className='w-full font-inter-regular truncate pl-1 pb-2'>
                    {data}
                  </div>
                </div>
                <div
                  className={`h-8 -mt-1 px-6 flex items-center justify-center rounded-md shadow-md font-inter-medium text-white
                    ${ativo ? 'bg-primaryMy' : 'bg-danger'}`}
                >
                  {ativo ? 'Oferta' : 'Pedido'}
                </div>
              </div>
            </div>
            <div className='w-full min-h-9 flex items-center justify-between'>
              <div className='w-1/2 h-full border-b border-borderMy flex'>
                <div className='w-44 h-full flex items-center font-inter-medium pb-2'>
                  Localização:
                </div>
                <div className='w-full h-full font-inter-regular truncate'>
                  {localizacao}
                </div>
              </div>
              <div className='flex items-center justify-between w-1/2 h-full gap-x-4'>
                <div className='w-full h-full flex items-center justify-center border-b border-borderMy'>
                  <div className='w-44 font-inter-medium pb-2'>
                    Responsável:
                  </div>
                  <div className='w-full font-inter-regular truncate pb-2 -ml-1'>
                    {responsavel}
                  </div>
                </div>
              </div>
            </div>
            <div className='w-full min-h-9 flex items-center justify-between'>
              <div className='w-1/2 h-full flex -mt-1'>
                <div className='w-44 h-full flex items-center font-inter-medium'>
                  Produto:
                </div>
                <div className='w-full h-full font-inter-regular truncate'>
                  {produto}
                </div>
              </div>
              <div className='flex items-center justify-between w-1/2 h-full gap-x-4'>
                <div className='w-full h-full flex items-center justify-between'>
                  <div className='w-1/2 h-full flex'>
                    <div className='w-44 font-inter-medium'>Quantidade:</div>
                    <div className='w-full font-inter-regular truncate ml-9'>
                      {quantidade}
                    </div>
                  </div>
                  <div className='w-1/2 h-full flex items-end justify-end gap-x-7'>
                    <div className='font-inter-medium'>Motivo:</div>
                    <div className='font-inter-regular truncate'>{motivo}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
