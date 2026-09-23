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
  const actionText = newStatus === 'Habilitado' ? 'Habilitar' : 'Desabilitar';
  const actionClassName =
    newStatus === 'Habilitado'
      ? 'bg-primaryMy text-[rgb(var(--color-action-foreground))] hover:bg-primaryMy/90'
      : 'bg-danger text-[rgb(var(--color-action-foreground))] hover:bg-danger/90';

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className='max-h-[min(80vh,40rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto border-borderMy bg-surface'>
        <AlertDialogHeader className='space-y-4'>
          <AlertDialogTitle className='text-center font-rajdhani-medium text-2xl text-clt-2'>
            Alterar status do usuário
          </AlertDialogTitle>
          <AlertDialogDescription className='space-y-4 font-inter-regular text-clt-1'>
            <div className='text-center'>
              <p className='mb-2 text-base'>
                Você está prestes a{' '}
                <span
                  className={
                    newStatus === 'Habilitado'
                      ? 'font-semibold text-primaryMy'
                      : 'font-semibold text-danger'
                  }
                >
                  {actionText}
                </span>{' '}
                o usuário:
              </p>
              <div className='rounded-lg border border-borderMy bg-surface-muted p-4'>
                <p className='mb-3 break-words font-rajdhani-medium text-lg text-clt-2'>
                  {userName}
                </p>
                <div className='flex flex-col items-stretch gap-4 text-sm sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex-1 text-center'>
                    <p className='mb-1 text-clt-1'>Status atual</p>
                    <span className='rounded-full border border-borderMy bg-surface px-3 py-1 text-xs font-semibold text-clt-2'>
                      {currentStatus}
                    </span>
                  </div>
                  <div className='hidden items-center gap-2 sm:flex' aria-hidden='true'>
                    <div className='h-0.5 w-8 bg-borderMy' />
                    <div className='h-2 w-2 rounded-full bg-borderMy' />
                  </div>
                  <div className='flex-1 text-center'>
                    <p className='mb-1 text-clt-1'>Novo status</p>
                    <span className='rounded-full border border-borderMy bg-surface px-3 py-1 text-xs font-semibold text-clt-2'>
                      {newStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className='rounded-lg border border-borderMy bg-surface-muted p-3'>
              <p className='text-center text-sm text-clt-1'>
                Esta ação altera as permissões de acesso do usuário ao sistema.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='flex-col gap-3 pt-2 sm:flex-row'>
          <AlertDialogCancel
            className='min-h-11 flex-1 border-borderMy bg-surface text-clt-2 hover:bg-surface-selected'
            disabled={isLoading}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-11 flex-1 ${actionClassName}`}
          >
            {isLoading ? (
              <span className='flex items-center gap-2'>
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white' />
                Alterando...
              </span>
            ) : (
              actionText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
