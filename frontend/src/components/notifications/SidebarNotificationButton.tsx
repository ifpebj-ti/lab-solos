import { useState } from 'react';
import { Bell } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Notificacao } from '@/integration/Notifications';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  NotificationFailureFeedback,
  useNotificationReading,
} from './NotificationIcon';

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

export function SidebarNotificationButton(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notificacoes,
    countNaoLidas,
    loading,
    failure,
    refresh,
    markAsRead,
  } = useNotificationReading();

  const handleMarcarComoLida = async (
    notificacaoId: number,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.stopPropagation();
    }
    await markAsRead(notificacaoId);
  };

  const handleNotificacaoClick = async (notificacao: Notificacao) => {
    // Marcar como lida se não estiver lida
    if (!notificacao.lida) {
      await handleMarcarComoLida(notificacao.id);
    }

    // Fechar o popover
    setIsOpen(false);

    // Navegar para o link de ação se existir
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
    <div className='flex justify-center px-3 py-2'>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='relative h-9 w-9 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            aria-label='Notificações'
          >
            <Bell className='h-4 w-4' />
            {!failure && countNaoLidas > 0 && (
              <span className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger p-0 text-xs font-medium text-white'>
                {countNaoLidas > 99 ? '99+' : countNaoLidas}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-80 border-borderMy bg-surface p-0 text-clt-2'
          align='end'
          sideOffset={8}
        >
          <div className='flex items-center justify-between border-b border-borderMy p-4'>
            <h3 className='font-semibold text-sm'>Notificações</h3>
            {!failure && countNaoLidas > 0 && (
              <span className='rounded-full bg-surface-selected px-2 py-1 text-xs text-clt-1'>
                {countNaoLidas} não lida{countNaoLidas !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className='max-h-96 overflow-y-auto'>
            {loading ? (
              <div className='flex items-center justify-center p-8'>
                <div className='h-6 w-6 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'></div>
              </div>
            ) : failure ? (
              <NotificationFailureFeedback failure={failure} onRetry={refresh} />
            ) : notificacoes.length === 0 ? (
              <div className='flex flex-col items-center justify-center p-8 text-center'>
                <Bell className='h-12 w-12 text-muted-foreground mb-3' />
                <p className='text-sm font-medium'>Nenhuma notificação</p>
                <p className='text-xs text-muted-foreground'>
                  Você está em dia com tudo!
                </p>
              </div>
            ) : (
              <div className='divide-y'>
                {notificacoes.slice(0, 10).map((notificacao) => (
                  <div
                    key={notificacao.id}
                    className={`cursor-pointer p-3 text-left transition-colors hover:bg-surface-selected ${
                      !notificacao.lida ? 'bg-surface-selected' : ''
                    }`}
                    onClick={() => handleNotificacaoClick(notificacao)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void handleNotificacaoClick(notificacao);
                      }
                    }}
                    role='button'
                    tabIndex={0}
                  >
                    <div className='flex items-start gap-3'>
                      <div className='shrink-0 text-sm mt-0.5'>
                        {getTipoIcon(notificacao.tipo)}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <p
                            className={`text-sm font-medium ${
                              !notificacao.lida
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {notificacao.titulo}
                          </p>
                          {!notificacao.lida && (
                            <div
                              role='img'
                              aria-label='Não lida'
                              className='w-2 h-2 bg-primary rounded-full shrink-0 mt-1'
                            ></div>
                          )}
                        </div>
                        <p className='mt-1 line-clamp-2 text-xs text-clt-1'>
                          {notificacao.mensagem}
                        </p>
                        <span className='mt-2 block text-xs text-clt-1'>
                          {formatarData(notificacao.dataCriacao)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notificacoes.length > 10 && (
            <div className='border-t border-borderMy p-3'>
              <Button
                variant='ghost'
                className='w-full text-sm'
                onClick={() => setIsOpen(false)}
              >
                Ver todas as notificações ({notificacoes.length})
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
