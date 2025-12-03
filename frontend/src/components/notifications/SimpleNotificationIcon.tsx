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
    console.error('Erro ao verificar nível do usuário:', error);
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
      console.error('Erro ao buscar notificações:', error);
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
      console.error('Erro ao marcar notificação como lida:', error);
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
        <div className='flex items-center justify-between w-full cursor-pointer p-0'>
          <div className='flex items-center gap-3'>
            <Bell className='h-4 w-4' />
            <span>Notificações</span>
          </div>
          {countNaoLidas > 0 && (
            <span className='flex items-center justify-center bg-red-500 rounded-full min-w-[18px] min-h-[18px] text-xs font-bold text-white'>
              {countNaoLidas > 99 ? '99+' : countNaoLidas}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 p-0 bg-white border'
        align='end'
        sideOffset={5}
      >
        <div className='flex items-center justify-between p-4 border-b'>
          <h3 className='font-semibold text-sm'>Notificações</h3>
          {countNaoLidas > 0 && (
            <span className='text-xs text-gray-500'>
              {countNaoLidas} não lida{countNaoLidas !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className='max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='flex items-center justify-center p-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
            </div>
          ) : notificacoes.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-8 text-center'>
              <Bell className='h-12 w-12 text-gray-300 mb-3' />
              <p className='text-sm text-gray-600'>Nenhuma notificação</p>
              <p className='text-xs text-gray-400'>
                Você está em dia com tudo!
              </p>
            </div>
          ) : (
            <div className='divide-y'>
              {notificacoes.slice(0, 10).map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notificacao.lida ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificacaoClick(notificacao)}
                >
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 text-sm mt-0.5'>
                      {getTipoIcon(notificacao.tipo)}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <p
                          className={`text-sm font-medium ${
                            !notificacao.lida
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }`}
                        >
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && (
                          <div className='w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1'></div>
                        )}
                      </div>
                      <p className='text-xs text-gray-500 mt-1 line-clamp-2'>
                        {notificacao.mensagem}
                      </p>
                      <span className='text-xs text-gray-400 mt-2 block'>
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
          <div className='p-3 border-t'>
            <Button
              variant='ghost'
              className='w-full text-sm text-blue-600 hover:text-blue-800'
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
