import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookie from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { Check } from 'lucide-react';

import SearchIcon from '../../../public/icons/SearchIcon';
import LinkIcon from '../../../public/icons/LinkIcon';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getNavigationSearchEntries } from '@/navigation/navigationModel';

interface JwtPayload {
  role?: string;
}

function OpenSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [value] = useState('');
  const navigate = useNavigate();
  const auth = Cookie.get('doorKey');
  const role = useMemo(() => {
    if (!auth) return null;
    try {
      return jwtDecode<JwtPayload>(auth).role ?? null;
    } catch {
      return null;
    }
  }, [auth]);
  const routes = getNavigationSearchEntries(role);

  const selectRoute = (route: string) => {
    setIsOpen(false);
    navigate(route);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <button
                type='button'
                aria-label='Pesquisar rotas'
                className='flex h-11 w-11 items-center justify-center rounded-md border border-borderMy transition-all duration-200 ease-in-out hover:bg-surface-selected'
              >
                <SearchIcon fill='currentColor' />
              </button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Abrir rotas</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent role='dialog'>
        <AlertDialogHeader>
          <AlertDialogTitle className='sr-only'>Pesquisar rotas</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='w-full'>
              <Command className='border border-borderMy bg-surface'>
                <CommandInput placeholder='Pesquisar link' />
                <p className='border-b border-t border-borderMy px-11 py-2 font-inter-medium text-clt-2'>
                  Links
                </p>
                <CommandList>
                  <CommandEmpty>Link não encontrado.</CommandEmpty>
                  <CommandGroup>
                    {routes.map((route) => (
                      <CommandItem
                        key={`${route.value}-${route.to}`}
                        value={`${route.value} ${route.label}`}
                        onSelect={() => selectRoute(route.to)}
                        className='font-inter-regular'
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === route.value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <LinkIcon />
                        {route.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default OpenSearch;
