import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationIcon } from './NotificationIcon';

const notificationsApi = vi.hoisted(() => ({
  getMinhasNotificacoes: vi.fn(),
  getCountNotificacoesNaoLidas: vi.fn(),
  marcarNotificacaoComoLida: vi.fn(),
  marcarVariasNotificacoesComoLidas: vi.fn(),
}));

vi.mock('@/integration/Notifications', () => notificationsApi);

type Notification = {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  tipoTexto: string;
  lida: boolean;
  dataCriacao: string;
};

const createNotification = (
  overrides: Partial<Notification> = {}
): Notification => ({
  id: 42,
  titulo: 'Aviso de teste',
  mensagem: 'Mensagem sintética',
  tipo: 'Sistema',
  tipoTexto: 'Sistema',
  lida: false,
  dataCriacao: '2026-11-24T12:00:00.000Z',
  ...overrides,
});

async function openNotifications(items: Notification[], count = 0) {
  notificationsApi.getMinhasNotificacoes.mockResolvedValue(items);
  notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({ count });
  render(<NotificationIcon />);

  fireEvent.click(await screen.findByRole('button', { name: 'Notificações' }));
}

describe('NotificationIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.getMinhasNotificacoes.mockResolvedValue([]);
    notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({
      count: 0,
    });
    notificationsApi.marcarNotificacaoComoLida.mockResolvedValue(undefined);
    notificationsApi.marcarVariasNotificacoesComoLidas.mockResolvedValue(
      undefined
    );
  });

  it.each([
    ['EstoqueBaixo', '📦', 'text-orange-600'],
    ['ProdutoVencido', '⚠️', 'text-red-600'],
    ['ProdutoProximoVencimento', '⏰', 'text-yellow-600'],
    ['SolicitacaoCadastro', '👤', 'text-blue-600'],
    ['SolicitacaoEmprestimo', '📋', 'text-blue-600'],
    ['NovoEmprestimo', '📋', 'text-gray-600'],
    ['SolicitacaoUsuario', '👤', 'text-gray-600'],
    ['EmprestimoAprovado', '✅', 'text-green-600'],
    ['EmprestimoRejeitado', '❌', 'text-red-600'],
    ['CadastroAprovado', '✅', 'text-green-600'],
    ['CadastroRejeitado', '❌', 'text-red-600'],
    ['Sistema', '⚙️', 'text-gray-600'],
    ['TipoDesconhecido', '🔔', 'text-gray-600'],
  ])('exibe o ícone e a cor da notificação %s', async (tipo, icon, color) => {
    await openNotifications([createNotification({ tipo, tipoTexto: tipo })]);

    expect(screen.getByText(icon)).toBeInTheDocument();
    expect(screen.getByText(tipo)).toHaveClass(color);
  });

  it.each([
    [1, '1'],
    [100, '99+'],
  ])('resume o contador de não lidas (%i)', async (count, expectedBadge) => {
    notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({ count });
    render(<NotificationIcon />);

    expect(await screen.findByText(expectedBadge)).toBeInTheDocument();
    expect(notificationsApi.getCountNotificacoesNaoLidas).toHaveResolvedWith({
      count,
    });
  });

  it.each(['Enter', ' '])(
    'marca uma notificação como lida pelo teclado com %s',
    async (key) => {
      await openNotifications([createNotification()]);
      const notification = screen
        .getByText('Aviso de teste')
        .closest('[role="button"]');

      expect(notification).not.toBeNull();
      fireEvent.keyDown(notification!, { key });

      await waitFor(() =>
        expect(notificationsApi.marcarNotificacaoComoLida).toHaveBeenCalledWith(
          42
        )
      );
    }
  );

  it('ignora teclas sem ação e formata data inválida com texto seguro', async () => {
    await openNotifications([
      createNotification({ dataCriacao: 'data inválida' }),
    ]);
    const notification = screen
      .getByText('Aviso de teste')
      .closest('[role="button"]');

    expect(screen.getByText('Há alguns instantes')).toBeInTheDocument();
    fireEvent.keyDown(notification!, { key: 'Escape' });

    expect(notificationsApi.marcarNotificacaoComoLida).not.toHaveBeenCalled();
  });
});
