import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from 'lucide-react';

import { NavSecondary } from './nav-secondary';
import { SidebarProvider } from './ui/sidebar';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import {
  getCountNotificacoesNaoLidas,
  getMinhasNotificacoes,
} from '@/integration/Notifications';
import { toast } from '@/components/hooks/use-toast';

const mocks = vi.hoisted(() => ({
  getMinhasNotificacoes: vi.fn(),
  getCountNotificacoesNaoLidas: vi.fn(),
  marcarNotificacaoComoLida: vi.fn(),
  marcarVariasNotificacoesComoLidas: vi.fn(),
  toast: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@/integration/Notifications', () => ({
  getMinhasNotificacoes: mocks.getMinhasNotificacoes,
  getCountNotificacoesNaoLidas: mocks.getCountNotificacoesNaoLidas,
  marcarNotificacaoComoLida: mocks.marcarNotificacaoComoLida,
  marcarVariasNotificacoesComoLidas: mocks.marcarVariasNotificacoesComoLidas,
}));

vi.mock('@/components/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/errors/presentError', () => ({ notifyError: mocks.notifyError }));

const notifications = [
  {
    id: 12,
    titulo: 'Solicitação de empréstimo',
    mensagem: 'Um pedido aguarda análise.',
    tipo: 'NovoEmprestimo',
    tipoTexto: 'Empréstimo',
    lida: false,
    dataCriacao: '2026-09-20T12:00:00.000Z',
  },
  {
    id: 13,
    titulo: 'Produto com estoque baixo',
    mensagem: 'Verifique a quantidade disponível.',
    tipo: 'EstoqueBaixo',
    tipoTexto: 'Estoque',
    lida: false,
    dataCriacao: '2026-09-20T12:00:00.000Z',
  },
];

function createNotification(
  overrides: Partial<(typeof notifications)[number]> = {}
) {
  return { ...notifications[0], ...overrides };
}

function renderNotifications(
  includeNotifications = true,
  items: { title: string; url: string; icon: typeof Home }[] = []
) {
  return render(
    <SidebarProvider>
      <NavSecondary items={items} includeNotifications={includeNotifications} />
    </SidebarProvider>
  );
}

async function openNotifications() {
  fireEvent.click(await screen.findByRole('button', { name: /Notificações/ }));
}

describe('NavSecondary notifications', () => {
  let allMarked = false;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    allMarked = false;
    mocks.getMinhasNotificacoes.mockReset();
    mocks.getCountNotificacoesNaoLidas.mockReset();
    mocks.marcarNotificacaoComoLida.mockReset();
    mocks.marcarVariasNotificacoesComoLidas.mockReset();
    mocks.toast.mockReset();
    mocks.notifyError.mockReset();
    mocks.marcarNotificacaoComoLida.mockResolvedValue(undefined);
    mocks.marcarVariasNotificacoesComoLidas.mockResolvedValue(undefined);
    mocks.getMinhasNotificacoes.mockImplementation(async () =>
      notifications.map((notification) => ({
        ...notification,
        lida: allMarked || notification.lida,
      }))
    );
    mocks.getCountNotificacoesNaoLidas.mockImplementation(async () => ({
      count: allMarked ? 0 : 2,
    }));
    mocks.marcarVariasNotificacoesComoLidas.mockImplementation(async () => {
      allMarked = true;
    });
  });

  it('marks every unread notification through the bulk endpoint', async () => {
    renderNotifications();

    const trigger = await screen.findByRole('button', {
      name: 'Notificações, 2 não lidas',
    });
    fireEvent.click(trigger);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Marcar todas as notificações como lidas',
      })
    );

    await waitFor(() => {
      expect(mocks.marcarVariasNotificacoesComoLidas).toHaveBeenCalledWith([
        12, 13,
      ]);
      expect(mocks.getCountNotificacoesNaoLidas).toHaveBeenLastCalledWith();
      expect(toast).toHaveBeenCalledWith({
        title: 'Notificações atualizadas',
        description: 'Todas as notificações foram marcadas como lidas.',
      });
    });
    expect(getMinhasNotificacoes).toHaveBeenCalledWith(false);
    expect(getCountNotificacoesNaoLidas).toHaveBeenCalled();
  });

  it.each([
    ['EstoqueBaixo', '📦'],
    ['ProdutoVencido', '⚠️'],
    ['ProdutoProximoVencimento', '⏰'],
    ['SolicitacaoCadastro', '👤'],
    ['SolicitacaoUsuario', '👤'],
    ['SolicitacaoEmprestimo', '📋'],
    ['NovoEmprestimo', '📋'],
    ['EmprestimoAprovado', '✅'],
    ['CadastroAprovado', '✅'],
    ['EmprestimoRejeitado', '❌'],
    ['CadastroRejeitado', '❌'],
    ['Sistema', '⚙️'],
    ['TipoDesconhecido', '🔔'],
  ])('shows the correct icon for notification type %s', async (tipo, icon) => {
    mocks.getMinhasNotificacoes.mockResolvedValue([
      createNotification({ tipo, lida: true }),
    ]);
    mocks.getCountNotificacoesNaoLidas.mockResolvedValue({ count: 0 });
    renderNotifications();

    await openNotifications();

    expect(screen.getByText(icon)).toBeInTheDocument();
  });

  it('shows the loading state until both notification requests finish', async () => {
    let resolveNotifications!: (value: typeof notifications) => void;
    let resolveCount!: (value: { count: number }) => void;
    mocks.getMinhasNotificacoes.mockImplementation(
      () => new Promise((resolve) => (resolveNotifications = resolve))
    );
    mocks.getCountNotificacoesNaoLidas.mockImplementation(
      () => new Promise((resolve) => (resolveCount = resolve))
    );
    renderNotifications();

    await openNotifications();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    resolveNotifications(notifications);
    resolveCount({ count: 2 });
    expect(await screen.findByText('Solicitação de empréstimo')).toBeInTheDocument();
  });

  it('shows an error and retries loading notifications', async () => {
    mocks.getMinhasNotificacoes
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(notifications);
    renderNotifications();

    await openNotifications();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as notificações.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Solicitação de empréstimo')).toBeInTheDocument();
    expect(mocks.getMinhasNotificacoes).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state and omits actions when there are no notifications', async () => {
    mocks.getMinhasNotificacoes.mockResolvedValue([]);
    mocks.getCountNotificacoesNaoLidas.mockResolvedValue({ count: 0 });
    renderNotifications();

    const trigger = await screen.findByRole('button', { name: 'Notificações' });
    expect(trigger.querySelector('[data-slot="badge"]')).not.toBeInTheDocument();
    fireEvent.click(trigger);

    expect(await screen.findByText('Nenhuma notificação encontrada')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar todas as notificações como lidas' })
    ).not.toBeInTheDocument();
  });

  it('caps the unread badge at 9+', async () => {
    mocks.getCountNotificacoesNaoLidas.mockResolvedValue({ count: 12 });
    renderNotifications();

    expect(
      await screen.findByRole('button', { name: 'Notificações, 12 não lidas' })
    ).toHaveTextContent('9+');
  });

  it('renders secondary links when notifications are excluded', () => {
    renderNotifications(false, [{ title: 'Ajuda', url: '/ajuda', icon: Home }]);

    expect(screen.queryByRole('button', { name: /Notificações/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajuda' })).toHaveAttribute(
      'href',
      '/ajuda'
    );
  });

  it('does not call the bulk endpoint when the unread count is stale', async () => {
    mocks.getMinhasNotificacoes.mockResolvedValue([]);
    mocks.getCountNotificacoesNaoLidas.mockResolvedValue({ count: 2 });
    renderNotifications();

    await openNotifications();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Marcar todas as notificações como lidas',
      })
    );

    expect(mocks.marcarVariasNotificacoesComoLidas).not.toHaveBeenCalled();
  });

  it('reports a bulk-mark failure and restores the action', async () => {
    const error = new Error('offline');
    mocks.marcarVariasNotificacoesComoLidas.mockRejectedValueOnce(error);
    renderNotifications();

    await openNotifications();
    const button = await screen.findByRole('button', {
      name: 'Marcar todas as notificações como lidas',
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        error,
        OPERATION_IDS.markNotificationsRead
      );
      expect(button).toBeEnabled();
    });
  });

  it('marks an unread notification individually and closes the popover', async () => {
    mocks.getMinhasNotificacoes.mockResolvedValue([
      createNotification({ dataCriacao: 'data inválida' }),
    ]);
    renderNotifications();

    await openNotifications();
    const notification = await screen.findByRole('button', {
      name: 'Não lida: Solicitação de empréstimo. Um pedido aguarda análise.',
    });
    expect(screen.getByText('Há alguns instantes')).toBeInTheDocument();
    fireEvent.click(notification);

    await waitFor(() => {
      expect(mocks.marcarNotificacaoComoLida).toHaveBeenCalledWith(12);
      expect(
        screen.queryByRole('button', { name: 'Não lida: Solicitação de empréstimo. Um pedido aguarda análise.' })
      ).not.toBeInTheDocument();
    });
  });

  it('keeps the popover open and reports an individual-mark failure', async () => {
    const error = new Error('offline');
    mocks.marcarNotificacaoComoLida.mockRejectedValueOnce(error);
    renderNotifications();

    await openNotifications();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Não lida: Solicitação de empréstimo. Um pedido aguarda análise.',
      })
    );

    await waitFor(() =>
      expect(mocks.notifyError).toHaveBeenCalledWith(
        error,
        OPERATION_IDS.markNotificationRead
      )
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes a read notification without calling the mark endpoint', async () => {
    mocks.getMinhasNotificacoes.mockResolvedValue([
      createNotification({ lida: true }),
    ]);
    renderNotifications();

    await openNotifications();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Solicitação de empréstimo. Um pedido aguarda análise.',
      })
    );

    await waitFor(() => {
      expect(mocks.marcarNotificacaoComoLida).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', {
          name: 'Solicitação de empréstimo. Um pedido aguarda análise.',
        })
      ).not.toBeInTheDocument();
    });
  });
});
