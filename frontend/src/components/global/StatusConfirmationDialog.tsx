import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StatusConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  currentStatus: string;
  newStatus: string;
  isLoading?: boolean;
}

export default function StatusConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  userName,
  currentStatus,
  newStatus,
  isLoading = false,
}: StatusConfirmationDialogProps) {
  const getStatusColor = (status: string) => {
    return status === 'Habilitado' ? 'text-green-600' : 'text-red-600';
  };

  const getActionText = () => {
    return newStatus === 'Habilitado' ? 'Habilitar' : 'Desabilitar';
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className='bg-backgroundMy border border-borderMy max-w-md'>
        <AlertDialogHeader className='space-y-4'>
          <AlertDialogTitle className='font-rajdhani-medium text-2xl text-clt-2 text-center'>
            Alterar Status do Usuário
          </AlertDialogTitle>
          <AlertDialogDescription className='font-inter-regular text-clt-1 space-y-4'>
            <div className='text-center'>
              <p className='text-base mb-2'>
                Você está prestes a{' '}
                <span className={`font-semibold ${getStatusColor(newStatus)}`}>
                  {getActionText()}
                </span>{' '}
                o usuário:
              </p>
              <div className='bg-cl-table-item rounded-lg p-4 border border-borderMy'>
                <p className='font-rajdhani-medium text-lg text-clt-2 mb-3'>
                  {userName}
                </p>
                <div className='flex justify-between items-center text-sm'>
                  <div className='text-center flex-1'>
                    <p className='text-clt-1 mb-1'>Status Atual</p>
                    <span
                      className={`font-semibold px-3 py-1 rounded-full text-xs ${
                        currentStatus === 'Habilitado'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}
                    >
                      {currentStatus}
                    </span>
                  </div>
                  <div className='mx-4'>
                    <div className='w-8 h-0.5 bg-borderMy'></div>
                    <div className='w-2 h-2 bg-borderMy rounded-full mx-auto mt-1'></div>
                  </div>
                  <div className='text-center flex-1'>
                    <p className='text-clt-1 mb-1'>Novo Status</p>
                    <span
                      className={`font-semibold px-3 py-1 rounded-full text-xs ${
                        newStatus === 'Habilitado'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}
                    >
                      {newStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
              <p className='text-sm text-blue-800 text-center'>
                💡 Esta ação irá alterar as permissões de acesso do usuário ao
                sistema.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='gap-3 pt-2'>
          <AlertDialogCancel
            className='flex-1 border border-borderMy bg-backgroundMy text-clt-2 hover:bg-cl-table-item font-inter-medium transition-colors'
            disabled={isLoading}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 font-inter-medium transition-colors ${
              newStatus === 'Habilitado'
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
            }`}
          >
            {isLoading ? (
              <div className='flex items-center gap-2'>
                <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                Alterando...
              </div>
            ) : (
              `${getActionText()}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
