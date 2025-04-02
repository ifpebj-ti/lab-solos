import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { Link } from 'react-router-dom';
import OpenSearch from '@/components/global/OpenSearch';
import FormQuimicos from '@/components/global/forms/create/FormQuimicos';
import FormVidrarias from '@/components/global/forms/create/FormVidraria';
import FormOutros from '@/components/global/forms/create/FormOutros';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function Index() {
  const isLoading = false;
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

  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
    }
  };

  return (
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='h-full w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy min-h-screen pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Cadastro de Bens
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <Popover>
                <PopoverTrigger asChild>
                  <button className='border border-borderMy font-inter-medium text-clt-2 text-sm rounded-md h-11 gap-x-3 px-4 uppercase flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200'>
                    <FileSpreadsheet
                      stroke='#232323'
                      width={21}
                      strokeWidth={1.5}
                    />
                    Importar Planilhas
                  </button>
                </PopoverTrigger>
                <PopoverContent className='min-w-32 shadow-lg border border-borderMy bg-backgroundMy p-2'>
                  <div className='w-full flex flex-col items-start gap-y-1'>
                    <a
                      href='../../../public/arquives/usuarios.xlsx'
                      download='usuarios.xlsx'
                      className='w-full hover:bg-gray-300 rounded py-1 flex px-2 font-inter-regular bg-cl-table-item text-sm items-center gap-x-3 cursor-pointer'
                    >
                      <FileText
                        stroke='#232323'
                        width={18}
                        strokeWidth={1.5}
                        className='mr-1 mt-[2px]'
                      />
                      Baixar Modelo da Planilha
                    </a>
                    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                      <AlertDialogTrigger asChild>
                        <div className='w-full hover:bg-gray-300 rounded py-1 flex px-2 font-inter-regular bg-cl-table-item text-sm items-center gap-x-3 cursor-pointer'>
                          <FileText
                            stroke='#232323'
                            width={18}
                            strokeWidth={1.5}
                            className='mr-1 mt-[2px]'
                          />
                          Submeter Planilha para Cadastro
                        </div>
                      </AlertDialogTrigger>
                      <AlertDialogContent
                        ref={dialogRef}
                        className='border border-borderMy max-w-96'
                      >
                        <AlertDialogHeader>
                          <AlertDialogTitle className='font-inter-light px-4 py-1 mt-1'>
                            Importar Planilha
                          </AlertDialogTitle>
                          <div className='w-full h-[1px] bg-borderMy'></div>
                        </AlertDialogHeader>
                        <AlertDialogDescription className='flex flex-col font-inter-regular'>
                          <div className='w-full px-3 pb-2'>
                            <label
                              htmlFor='file-upload'
                              className={`w-full h-36 border-[1px] rounded-md flex flex-col items-center justify-center gap-y-4 cursor-pointer transition-all ${
                                dragOver
                                  ? 'bg-green-100 border-green-500'
                                  : 'border-primaryMy hover:bg-cl-table-item'
                              }`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                            >
                              <FileSpreadsheet
                                stroke='#16a34a'
                                width={45}
                                height={45}
                                strokeWidth={1}
                              />
                              <p className='font-inter-regular text-cl-icon text-balance text-center'>
                                {fileName
                                  ? `Arquivo selecionado: ${fileName}`
                                  : 'Clique para selecionar ou arraste o arquivo até aqui'}
                              </p>
                            </label>
                            <input
                              id='file-upload'
                              type='file'
                              accept='.xlsx,.xls,.csv'
                              className='hidden'
                              onChange={handleFileChange}
                            />
                            <div className='flex items-end justify-end w-full'>
                              <button className='w-1/2 rounded-sm h-8 border border-primaryMy font-inter-semibold mt-4 text-primaryMy hover:bg-primaryMy transition-all ease-in-out duration-200 hover:text-white'>
                                Enviar
                              </button>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </PopoverContent>
              </Popover>
              <Link
                to={'/admin/insert/launch'}
                className='border border-borderMy rounded-md h-11 px-4 uppercase font-inter-medium text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200 flex items-center'
              >
                Realizar Lançamento
              </Link>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-h-96 mt-6'>
            <Tabs defaultValue='quimicos' className='w-full'>
              <TabsList className='w-full flex items-center justify-between h-[52px] border border-borderMy rounded-md px-2'>
                <TabsTrigger
                  value='quimicos'
                  className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
                >
                  Químicos
                </TabsTrigger>
                <TabsTrigger
                  value='vidrarias'
                  className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
                >
                  Vidrarias
                </TabsTrigger>
                <TabsTrigger
                  value='outros'
                  className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
                >
                  Outros
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value='quimicos'
                className='w-full mt-10 rounded-md border border-borderMy p-4'
              >
                <FormQuimicos />
              </TabsContent>
              <TabsContent
                value='vidrarias'
                className='w-full mt-10 rounded-md border border-borderMy p-4'
              >
                <FormVidrarias />
              </TabsContent>
              <TabsContent
                value='outros'
                className='w-full mt-10 rounded-md border border-borderMy p-4'
              >
                <FormOutros />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </>
  );
}

export default Index;
