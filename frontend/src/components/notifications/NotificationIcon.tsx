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
      console.error('Erro ao buscar notificações:', error);
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
      console.error('Erro ao marcar notificação como lida:', error);
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
      console.error('Erro ao marcar todas as notificações como lidas:', error);
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
            <span className='absolute -top-1 -right-1 flex items-center justify-center bg-red-500 rounded-full min-w-[18px] min-h-[18px] text-xs font-bold text-white'>
              {countNaoLidas > 99 ? '99+' : countNaoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 p-0 bg-backgroundMy border-borderMy'
        align='end'
        sideOffset={5}
      >
        <div className='flex items-center justify-between p-4 border-b border-borderMy'>
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
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primaryMy'></div>
            </div>
          ) : notificacoes.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-8 text-center'>
              <Bell className='h-12 w-12 text-gray-300 mb-3' />
              <p className='text-sm text-clt-1'>Nenhuma notificação</p>
              <p className='text-xs text-gray-500'>
                Você está em dia com tudo!
              </p>
            </div>
          ) : (
            <div className='divide-y divide-borderMy'>
              {notificacoes.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-3 hover:bg-cl-table-item transition-colors cursor-pointer ${
                    !notificacao.lida ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleNotificacaoClick(notificacao)}
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
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarcarComoLida(notificacao.id);
                              }}
                              className='h-6 w-6 p-0 text-primaryMy hover:text-primaryMy/80'
                              title='Marcar como lida'
                            >
                              <Check className='h-3 w-3' />
                            </Button>
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
                        <span className='text-xs text-gray-500'>
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
