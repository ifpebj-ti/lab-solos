import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavSecondary } from './nav-secondary';
import { SidebarProvider } from './ui/sidebar';
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
}));

vi.mock('@/integration/Notifications', () => ({
  getMinhasNotificacoes: mocks.getMinhasNotificacoes,
  getCountNotificacoesNaoLidas: mocks.getCountNotificacoesNaoLidas,
  marcarNotificacaoComoLida: mocks.marcarNotificacaoComoLida,
  marcarVariasNotificacoesComoLidas: mocks.marcarVariasNotificacoesComoLidas,
}));

vi.mock('@/components/hooks/use-toast', () => ({ toast: mocks.toast }));

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

function renderNotifications() {
  return render(
    <SidebarProvider>
      <NavSecondary items={[]} />
    </SidebarProvider>
  );
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
});
