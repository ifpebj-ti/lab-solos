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

export function SidebarNotificationButton(): React.JSX.Element {
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

      // O backend já está filtrando as notificações baseado no nível do usuário
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
            {countNaoLidas > 0 && (
              <span className='absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white rounded-full font-medium'>
                {countNaoLidas > 99 ? '99+' : countNaoLidas}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-80 p-0' align='end' sideOffset={8}>
          <div className='flex items-center justify-between p-4 border-b'>
            <h3 className='font-semibold text-sm'>Notificações</h3>
            {countNaoLidas > 0 && (
              <span className='text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full'>
                {countNaoLidas} não lida{countNaoLidas !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className='max-h-96 overflow-y-auto'>
            {loading ? (
              <div className='flex items-center justify-center p-8'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
              </div>
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
                    className={`p-3 hover:bg-accent transition-colors cursor-pointer ${
                      !notificacao.lida ? 'bg-muted/30' : ''
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
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {notificacao.titulo}
                          </p>
                          {!notificacao.lida && (
                            <div className='w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1'></div>
                          )}
                        </div>
                        <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                          {notificacao.mensagem}
                        </p>
                        <span className='text-xs text-muted-foreground mt-2 block'>
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
