import { useState, useEffect } from 'react';
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
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
// import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // const navigate = useNavigate();

  const fetchNotificacoes = async () => {
    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        getMinhasNotificacoes(false),
        getCountNotificacoesNaoLidas(),
      ]);
      setNotificacoes(notifs);
      setCountNaoLidas(count.count);
    } catch (error) {
      notifyError(error, OPERATION_IDS.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificacoes();
    // Buscar notificações a cada 30 segundos
    const interval = setInterval(fetchNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarcarComoLida = async (notificacaoId: number) => {
    try {
      await marcarNotificacaoComoLida(notificacaoId);
      await fetchNotificacoes();
    } catch (error) {
      notifyError(error, OPERATION_IDS.markNotificationRead);
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      const naoLidas = notificacoes.filter((n) => !n.lida);
      if (naoLidas.length > 0) {
        const ids = naoLidas.map((n) => n.id);
        await marcarVariasNotificacoesComoLidas(ids);
        await fetchNotificacoes();
      }
    } catch (error) {
      notifyError(error, OPERATION_IDS.markNotificationsRead);
    }
  };

  const handleNotificacaoClick = async (notificacao: Notificacao) => {
    // Marcar como lida se não estiver lida
    if (!notificacao.lida) {
      await handleMarcarComoLida(notificacao.id);
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
          {countNaoLidas > 0 && (
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
            {countNaoLidas > 0 && (
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
                    <div className='flex-shrink-0 text-lg mt-0.5'>
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
                          <div className='flex-shrink-0'>
                            <Check
                              className='h-3 w-3 text-primaryMy'
                              aria-label='Lida'
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
