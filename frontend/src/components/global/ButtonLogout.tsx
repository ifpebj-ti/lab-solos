import { LogOutIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clearSession } from '@/auth/session';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function ButtonLogout() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={'/'}
            onClick={() => clearSession({ discardAuthContext: true })}
            aria-label='Sair'
            className='group flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy text-clt-2 transition-colors hover:border-danger hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
          >
            <LogOutIcon
              width={18}
              className='text-clt-2 group-hover:text-danger'
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent className='bg-surface text-clt-2'>
          <p className='font-inter-medium'>Logout</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ButtonLogout;
