import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import SearchIcon from '../../../public/icons/SearchIcon';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import LinkIcon from '../../../public/icons/LinkIcon';

import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const frameworks = [
  {
    value: 'home',
    label: 'Home',
    route: '/', // Adicionando a rota desejada
  },
  {
    value: 'criação de conta',
    label: 'Criação de conta',
    route: '/register',
  },
  {
    value: 'login',
    label: 'Login',
    route: '/login',
  },
];

function OpenSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [value] = useState('');
  const navigate = useNavigate();

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
        <button
          onClick={() => setIsOpen(true)}
          className='border border-borderMy rounded-md h-11 w-11 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200'
        >
          <SearchIcon fill='#232323' />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent ref={dialogRef}>
        <AlertDialogHeader>
          <AlertDialogDescription>
            <Command className='border border-borderMy'>
              <CommandInput placeholder='Search framework...' />
              <p className='pl-11 font-inter-medium py-2 border-b border-t border-gray-300 text-clt-2'>
                Links
              </p>
              <CommandList>
                <CommandEmpty>No framework found.</CommandEmpty>
                <CommandGroup>
                  {frameworks.map((framework) => (
                    <CommandItem
                      key={framework.value}
                      value={framework.value}
                      onSelect={() => {
                        navigate(framework.route);
                      }}
                      className='font-inter-regular'
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === framework.value
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <LinkIcon />
                      {framework.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default OpenSearch;
