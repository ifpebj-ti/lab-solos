import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
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
} from '@/integration/Notifications';
import { Button } from '@/components/ui/button';
// import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Cookie from 'js-cookie';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';

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

// Função para verificar se o usuário é administrador
const isUserAdmin = (): boolean => {
  try {
    const userInfo = Cookie.get('userInfo');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      return (
        user.nivelUsuario === 'Administrador' ||
        user.tipoUsuario === 'Administrador'
      );
    }
  } catch (error) {
    notifyError(error, OPERATION_IDS.notifications);
  }
  return false;
};

// Função para filtrar notificações baseado no tipo de usuário
const filterNotificationsByUserLevel = (
  notificacoes: Notificacao[]
): Notificacao[] => {
  const isAdmin = isUserAdmin();

  if (isAdmin) {
    // Administradores veem todas as notificações
    return notificacoes;
  }

  // Usuários não-administradores só veem notificações pessoais (não relacionadas a administração)
  return notificacoes.filter((notif) => {
    const adminOnlyTypes = [
      'EstoqueBaixo',
      'ProdutoVencido',
      'ProdutoProximoVencimento',
      'SolicitacaoUsuario',
      'NovoEmprestimo',
    ];
    return !adminOnlyTypes.includes(notif.tipo);
  });
};

export function SimpleNotificationIcon(): React.JSX.Element {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // const navigate = useNavigate();

  const fetchNotificacoes = async () => {
    try {
      setLoading(true);
      const [notifs] = await Promise.all([
        getMinhasNotificacoes(false),
        getCountNotificacoesNaoLidas(),
      ]);

      // Filtrar notificações baseado no nível do usuário
      const filteredNotifs = filterNotificationsByUserLevel(notifs);
      const filteredCount = filteredNotifs.filter((n) => !n.lida).length;

      setNotificacoes(filteredNotifs);
      setCountNaoLidas(filteredCount);
    } catch (error) {
      notifyError(error, OPERATION_IDS.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificacoes();
    // Buscar notificações a cada 60 segundos
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
      notifyError(error, OPERATION_IDS.markNotificationRead);
    }
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          className='flex h-11 w-full items-center justify-between rounded-md p-0 focus-visible:ring-2 focus-visible:ring-focus'
          aria-label='Notificações'
        >
          <div className='flex items-center gap-3'>
            <Bell className='h-4 w-4' />
            <span>Notificações</span>
          </div>
          {countNaoLidas > 0 && (
            <span className='flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-xs font-bold text-white'>
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
          <h3 className='font-semibold text-sm'>Notificações</h3>
          {countNaoLidas > 0 && (
            <span className='text-xs text-clt-1'>
              {countNaoLidas} não lida{countNaoLidas !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className='max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='flex items-center justify-center p-8'>
              <div className='h-6 w-6 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'></div>
            </div>
          ) : notificacoes.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-8 text-center'>
              <Bell className='mb-3 h-12 w-12 text-clt-1' />
              <p className='text-sm text-clt-1'>Nenhuma notificação</p>
              <p className='text-xs text-clt-1'>Você está em dia com tudo!</p>
            </div>
          ) : (
            <div className='divide-y divide-borderMy'>
              {notificacoes.slice(0, 10).map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`cursor-pointer border-0 bg-transparent p-3 text-left transition-colors hover:bg-surface-selected ${
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
                    <div className='flex-shrink-0 text-sm mt-0.5'>
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
                          <div className='mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primaryMy'></div>
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
              className='w-full text-sm text-primaryMy hover:text-primaryMy/80'
              onClick={() => setIsOpen(false)}
            >
              Ver todas as notificações ({notificacoes.length})
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
