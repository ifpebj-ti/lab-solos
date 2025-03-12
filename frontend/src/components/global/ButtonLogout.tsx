import { LogOutIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
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
        <TooltipTrigger>
          <Link
            to={'/'}
            className='border border-borderMy h-11 w-11 rounded-md flex items-center justify-center hover:border-red-600 transition-all ease-in-out duration-150 hover:bg-cl-table-item group'
          >
            <LogOutIcon
              stroke='#232323'
              width={18}
              className='group-hover:stroke-red-700'
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent className='bg-red-600'>
          <p className='font-inter-medium'>Logout</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ButtonLogout;
