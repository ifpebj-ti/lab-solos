import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Cookie from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  sub: string; // ID ou nível do usuário
  role?: string; // Caso tenha uma role específica
  nivel: string;
}

const routesAdmin = [
  {
    value: 'home',
    label: 'Home',
    route: '/admin/', // Adicionando a rota desejada
  },
  {
    value: 'Adicionar Material',
    label: 'Adicionar Material',
    route: '/admin/insert',
  },
  {
    value: 'Acompanhamento de Alertas',
    label: 'Acompanhamento de Alertas',
    route: '/admin/follow-up',
  },
  {
    value: 'Usuários Cadastrados',
    label: 'Usuários Cadastrados',
    route: '/admin/users',
  },
  {
    value: 'Pesquisar Material',
    label: 'Pesquisar Material',
    route: '/admin/search-material',
  },
  {
    value: 'Solicitações de Cadastros',
    label: 'Solicitações de Cadastros',
    route: '/admin/registered-mentors',
  },
];
const routesMentee = [
  {
    value: 'Home',
    label: 'Home',
    route: '/mentee/', // Adicionando a rota desejada
  },
  {
    value: 'Pesquisar Material',
    label: 'Pesquisar Material',
    route: '/mentee/search-material',
  },
  {
    value: 'Histórico Pessoal',
    label: 'Histórico Pessoal',
    route: '/mentee/history/mentoring',
  },
  {
    value: 'Perfil',
    label: 'Perfil',
    route: '/mentee/profile',
  },
];

const routesMentor = [
  {
    value: 'Home',
    label: 'Home',
    route: '/mentor/', // Adicionando a rota desejada
  },
  {
    value: 'Histórico da Turma',
    label: 'Histórico da Turma',
    route: '/mentor/history/class',
  },
  {
    value: 'Criar Empréstimo',
    label: 'Criar Empréstimo',
    route: '/mentor/loan/creation',
  },
  {
    value: 'Requisições de Usuários',
    label: 'Requisições de Usuários',
    route: '/mentor/users-request',
  },
  {
    value: 'Pesquisar Material',
    label: 'Pesquisar Material',
    route: '/mentor/search-material',
  },
  {
    value: 'Minha Turma',
    label: 'Minha Turma',
    route: '/mentor/my-class',
  },
  {
    value: 'Perfil',
    label: 'Perfil',
    route: '/mentor/profile',
  },
];

function OpenSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [value] = useState('');
  const navigate = useNavigate();
  const auth = Cookie.get('doorKey');
  const decoded = jwtDecode<JwtPayload>(auth!);

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className='flex'>
          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTitle className='text-transparent'>.</AlertDialogTitle>
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
                    <CommandInput placeholder='Pesquisar link' />
                    <p className='pl-11 font-inter-medium py-2 border-b border-t border-gray-300 text-clt-2'>
                      Links
                    </p>
                    <CommandList>
                      <CommandEmpty>Link não encontrado.</CommandEmpty>
                      <CommandGroup>
                        {decoded.nivel === 'Administrador' &&
                          routesAdmin.map((framework) => (
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
                        {decoded.nivel === 'Mentor' &&
                          routesMentor.map((framework) => (
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
                        {decoded.nivel === 'Mentorado' &&
                          routesMentee.map((framework) => (
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
        </TooltipTrigger>
        <TooltipContent>
          <p className='font-inter-medium'>Abrir rotas</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default OpenSearch;
