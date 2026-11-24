import { LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logoutSession } from '@/integration/Auth';
import { notifyError } from '@/errors/presentError';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function ButtonLogout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutSession();
      navigate('/', { replace: true });
    } catch (error: unknown) {
      notifyError(error, 'encerrar a sessão');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            onClick={() => void handleLogout()}
            aria-label='Sair'
            className='group flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy text-clt-2 transition-colors hover:border-danger hover:bg-surface-selected focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus'
          >
            <LogOutIcon
              width={18}
              className='text-clt-2 group-hover:text-danger'
            />
          </button>
        </TooltipTrigger>
        <TooltipContent className='bg-surface text-clt-2'>
          <p className='font-inter-medium'>Logout</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ButtonLogout;
