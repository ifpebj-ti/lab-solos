import * as React from 'react';
import { type LucideIcon, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Notificacao,
  getMinhasNotificacoes,
  getCountNotificacoesNaoLidas,
  marcarNotificacaoComoLida,
} from '@/integration/Notifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case 'EstoqueBaixo':
      return '📦';
    case 'ProdutoVencido':
      return '⚠️';
    case 'ProdutoProximoVencimento':
      return '⏰';
    case 'SolicitacaoCadastro':
    case 'SolicitacaoUsuario':
      return '👤';
    case 'SolicitacaoEmprestimo':
    case 'NovoEmprestimo':
      return '📋';
    case 'EmprestimoAprovado':
    case 'CadastroAprovado':
      return '✅';
    case 'EmprestimoRejeitado':
    case 'CadastroRejeitado':
      return '❌';
    case 'Sistema':
      return '⚙️';
    default:
      return '🔔';
  }
};

function NotificationItem() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotificacoes = async () => {
    try {
      setLoading(true);
      const [notifs, countData] = await Promise.all([
        getMinhasNotificacoes(false),
        getCountNotificacoesNaoLidas(),
      ]);

      setNotificacoes(notifs);
      setCountNaoLidas(countData.count);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarcarComoLida = async (
    notificacaoId: number,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.stopPropagation();
    }
    try {
      await marcarNotificacaoComoLida(notificacaoId);
      await fetchNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const handleNotificacaoClick = async (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      await handleMarcarComoLida(notificacao.id);
    }

    setIsOpen(false);

    if (notificacao.linkAcao) {
      navigate(notificacao.linkAcao);
    }
  };

  const formatarData = (data: string) => {
    try {
      return formatDistanceToNow(new Date(data), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'Há alguns instantes';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton size='sm' className='relative'>
          <Bell className='h-4 w-4' />
          <span>Notificações</span>
          {countNaoLidas > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center'
            >
              {countNaoLidas > 99 ? '99+' : countNaoLidas}
            </Badge>
          )}
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0' side='right' align='start'>
        <div className='p-4 border-b'>
          <h3 className='font-semibold text-sm'>
            Notificações {countNaoLidas > 0 && `(${countNaoLidas} não lidas)`}
          </h3>
        </div>
        <div className='max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              Carregando...
            </div>
          ) : notificacoes.length === 0 ? (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              Nenhuma notificação encontrada
            </div>
          ) : (
            notificacoes.slice(0, 10).map((notificacao) => (
              <div
                key={notificacao.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                  !notificacao.lida ? 'bg-muted/30' : ''
                }`}
                onClick={() => handleNotificacaoClick(notificacao)}
              >
                <div className='flex items-start gap-3'>
                  <span className='text-lg flex-shrink-0 mt-0.5'>
                    {getTipoIcon(notificacao.tipo)}
                  </span>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <p className='font-medium text-sm truncate'>
                        {notificacao.titulo}
                      </p>
                      {!notificacao.lida && (
                        <div className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2' />
                      )}
                    </div>
                    <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                      {notificacao.mensagem}
                    </p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {formatarData(notificacao.dataCriacao)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NavSecondary({
  items,
  includeNotifications = true,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
  includeNotifications?: boolean;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {includeNotifications && (
            <SidebarMenuItem>
              <NotificationItem />
            </SidebarMenuItem>
          )}
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size='sm'>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
