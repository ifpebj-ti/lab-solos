import { useCallback, useEffect, useState } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Notificacao,
  getMinhasNotificacoes,
  getCountNotificacoesNaoLidas,
  marcarNotificacaoComoLida,
  marcarVariasNotificacoesComoLidas,
} from '@/integration/Notifications';
import { Button } from '@/components/ui/button';
import { OPERATION_IDS, type OperationId } from '@/errors/errorCatalog';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type NotificationFailure = { error: unknown; operation: OperationId };

// eslint-disable-next-line react-refresh/only-export-components -- This hook is shared by the notification variants.
export function useNotificationReading() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<NotificationFailure | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getMinhasNotificacoes(false),
        getCountNotificacoesNaoLidas(),
      ]);
      setNotificacoes(notifs);
      setCountNaoLidas(count.count);
      setFailure(null);
    } catch (error) {
      setFailure({ error, operation: OPERATION_IDS.notifications });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        await marcarNotificacaoComoLida(notificationId);
        await refresh();
      } catch (error) {
        setFailure({ error, operation: OPERATION_IDS.markNotificationRead });
      }
    },
    [refresh]
  );

  const markManyAsRead = useCallback(
    async (notificationIds: number[]) => {
      try {
        await marcarVariasNotificacoesComoLidas(notificationIds);
        await refresh();
      } catch (error) {
        setFailure({ error, operation: OPERATION_IDS.markNotificationsRead });
      }
    },
    [refresh]
  );

  return {
    notificacoes,
    countNaoLidas,
    loading,
    failure,
    refresh,
    markAsRead,
    markManyAsRead,
  };
}

export function NotificationFailureFeedback({
  failure,
  onRetry,
}: {
  failure: NotificationFailure | null;
  onRetry: () => void;
}) {
  if (!failure) return null;

  return (
    <ErrorFeedback
      error={failure.error}
      operation={failure.operation}
      onRetry={onRetry}
      className='rounded-none border-0 p-4'
    />
  );
}

interface NotificationIconProps {
  className?: string;
}

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case 'EstoqueBaixo':
      return '📦';
    case 'ProdutoVencido':
      return '⚠️';
    case 'ProdutoProximoVencimento':
      return '⏰';
    case 'SolicitacaoCadastro':
      return '👤';
    case 'SolicitacaoEmprestimo':
      return '📋';
    case 'NovoEmprestimo':
      return '📋';
    case 'SolicitacaoUsuario':
      return '👤';
    case 'EmprestimoAprovado':
      return '✅';
    case 'EmprestimoRejeitado':
      return '❌';
    case 'CadastroAprovado':
      return '✅';
    case 'CadastroRejeitado':
      return '❌';
    case 'Sistema':
      return '⚙️';
    default:
      return '🔔';
  }
};

const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case 'EstoqueBaixo':
      return 'text-orange-600';
    case 'ProdutoVencido':
      return 'text-red-600';
    case 'ProdutoProximoVencimento':
      return 'text-yellow-600';
    case 'SolicitacaoCadastro':
      return 'text-blue-600';
    case 'SolicitacaoEmprestimo':
      return 'text-blue-600';
    case 'EmprestimoAprovado':
      return 'text-green-600';
    case 'EmprestimoRejeitado':
      return 'text-red-600';
    case 'CadastroAprovado':
      return 'text-green-600';
    case 'CadastroRejeitado':
      return 'text-red-600';
    case 'Sistema':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

export function NotificationIcon({ className = '' }: NotificationIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notificacoes,
    countNaoLidas,
    loading,
    failure,
    refresh,
    markAsRead,
    markManyAsRead,
  } = useNotificationReading();

  const handleMarcarTodasComoLidas = async () => {
    const naoLidas = notificacoes.filter((n) => !n.lida);
    if (naoLidas.length > 0) {
      await markManyAsRead(naoLidas.map((n) => n.id));
    }
  };

  const handleNotificacaoClick = async (notificacao: Notificacao) => {
    // Marcar como lida se não estiver lida
    if (!notificacao.lida) {
      await markAsRead(notificacao.id);
    }

    // Navegar para o link de ação se existir
    // if (notificacao.linkAcao) {
    //   navigate(notificacao.linkAcao);
    //   setIsOpen(false);
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
        <Button
          variant='ghost'
          size='icon'
          className={`relative ${className}`}
          aria-label='Notificações'
        >
          <Bell className='h-5 w-5' />
          {!failure && countNaoLidas > 0 && (
            <span className='absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-xs font-bold text-white'>
              {countNaoLidas > 99 ? '99+' : countNaoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 border-borderMy bg-surface p-0 text-clt-2'
        align='end'
        sideOffset={5}
      >
        <div className='flex items-center justify-between border-b border-borderMy p-4'>
          <h3 className='font-rajdhani-medium text-lg text-clt-2'>
            Notificações
          </h3>
          <div className='flex items-center gap-2'>
            {!failure && countNaoLidas > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={handleMarcarTodasComoLidas}
                className='text-xs text-primaryMy hover:text-primaryMy/80'
                title='Marcar todas como lidas'
              >
                <CheckCheck className='h-4 w-4' />
              </Button>
            )}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsOpen(false)}
              className='text-clt-1 hover:text-clt-2'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
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
              <Bell className='h-12 w-12 text-gray-300 mb-3' />
              <p className='text-sm text-clt-1'>Nenhuma notificação</p>
              <p className='text-xs text-clt-1'>Você está em dia com tudo!</p>
            </div>
          ) : (
            <div className='divide-y divide-borderMy'>
              {notificacoes.map((notificacao) => (
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
                    <div className='shrink-0 text-lg mt-0.5'>
                      {getTipoIcon(notificacao.tipo)}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <p
                          className={`text-sm font-medium ${
                            !notificacao.lida ? 'text-clt-2' : 'text-clt-1'
                          }`}
                        >
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && (
                          <div className='shrink-0'>
                            <Check
                              className='h-3 w-3 text-primaryMy'
                              aria-label='Não lida'
                            />
                          </div>
                        )}
                      </div>
                      <p className='text-xs text-clt-1 mt-1 line-clamp-2'>
                        {notificacao.mensagem}
                      </p>
                      <div className='flex items-center justify-between mt-2'>
                        <span
                          className={`text-xs font-medium ${getTipoColor(
                            notificacao.tipo
                          )}`}
                        >
                          {notificacao.tipoTexto}
                        </span>
                        <span className='text-xs text-clt-1'>
                          {formatarData(notificacao.dataCriacao)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notificacoes.length > 0 && (
          <div className='p-3 border-t border-borderMy'>
            <Button
              variant='ghost'
              className='w-full text-sm text-primaryMy hover:text-primaryMy/80'
              onClick={() => {
                // Aqui poderia navegar para uma página de todas as notificações
                setIsOpen(false);
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
