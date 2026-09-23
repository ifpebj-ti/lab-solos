import * as React from 'react';
import { type LucideIcon, Bell, CheckCheck } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { toast } from '@/components/hooks/use-toast';
import {
  Notificacao,
  getMinhasNotificacoes,
  getCountNotificacoesNaoLidas,
  marcarNotificacaoComoLida,
  marcarVariasNotificacoesComoLidas,
} from '@/integration/Notifications';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotificacoes = async () => {
    try {
      setLoading(true);
      const [notifs, countData] = await Promise.all([
        getMinhasNotificacoes(false),
        getCountNotificacoesNaoLidas(),
      ]);

      setNotificacoes(notifs);
      setCountNaoLidas(countData.count);
      setLoadError(false);
    } catch {
      setLoadError(true);
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
  ): Promise<boolean> => {
    if (event) {
      event.stopPropagation();
    }
    try {
      await marcarNotificacaoComoLida(notificacaoId);
      await fetchNotificacoes();
      return true;
    } catch (error) {
      notifyError(error, OPERATION_IDS.markNotificationRead);
      return false;
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    const idsNaoLidas = notificacoes
      .filter((notificacao) => !notificacao.lida)
      .map((notificacao) => notificacao.id);

    if (idsNaoLidas.length === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    try {
      await marcarVariasNotificacoesComoLidas(idsNaoLidas);
      await fetchNotificacoes();
      toast({
        title: 'Notificações atualizadas',
        description: 'Todas as notificações foram marcadas como lidas.',
      });
    } catch (error) {
      notifyError(error, OPERATION_IDS.markNotificationsRead);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificacaoClick = async (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      const marked = await handleMarcarComoLida(notificacao.id);
      if (!marked) return;
    }

    setIsOpen(false);

    // if (notificacao.linkAcao) {
    //   navigate(notificacao.linkAcao);
    // }
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
        <SidebarMenuButton
          type='button'
          className='flex items-center justify-between gap-2'
          aria-label={`Notificações${countNaoLidas > 0 ? `, ${countNaoLidas} não lidas` : ''}`}
        >
          <div className='flex items-center gap-2'>
            <Bell className='h-4 w-4' />
            <span>Notificações</span>
          </div>

          {countNaoLidas > 0 && (
            <Badge
              variant='destructive'
              aria-hidden='true'
              className='mr-1 h-[18px] min-w-[18px] shrink-0 rounded-full border border-sidebar bg-danger px-1 py-0 text-[10px] font-bold leading-none text-white shadow-none'
            >
              {countNaoLidas > 9 ? '9+' : countNaoLidas}
            </Badge>
          )}
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        className='w-[min(22rem,calc(100vw-1.5rem))] border-borderMy bg-surface p-0 text-clt-2 shadow-lg'
        side='right'
        align='start'
      >
        <div className='flex flex-col items-start gap-3 border-b border-borderMy p-4'>
          <h3 className='text-sm font-semibold'>
            Notificações
            <span className='ml-2 font-normal text-clt-1'>
              ({countNaoLidas} não lidas)
            </span>
          </h3>
          {countNaoLidas > 0 ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              disabled={isMarkingAll}
              onClick={() => void handleMarcarTodasComoLidas()}
              aria-label='Marcar todas as notificações como lidas'
              className='h-9 w-full justify-start gap-2 px-2 text-xs text-clt-2 hover:bg-surface-selected'
            >
              <CheckCheck aria-hidden='true' className='h-4 w-4' />
              {isMarkingAll ? 'Marcando...' : 'Marcar todas como lidas'}
            </Button>
          ) : null}
        </div>
        <div className='max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              Carregando...
            </div>
          ) : loadError ? (
            <div
              role='alert'
              className='flex flex-col items-center gap-3 p-6 text-center'
            >
              <p className='text-sm text-clt-2'>
                Não foi possível carregar as notificações.
              </p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void fetchNotificacoes()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : notificacoes.length === 0 ? (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              Nenhuma notificação encontrada
            </div>
          ) : (
            notificacoes.slice(0, 10).map((notificacao) => (
              <button
                key={notificacao.id}
                type='button'
                className={`block w-full border-b border-borderMy p-3 text-left transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                  !notificacao.lida ? 'bg-muted/30' : ''
                }`}
                onClick={() => handleNotificacaoClick(notificacao)}
                aria-label={`${notificacao.lida ? '' : 'Não lida: '}${notificacao.titulo}. ${notificacao.mensagem}`}
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
              </button>
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
