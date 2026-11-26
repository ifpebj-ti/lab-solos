import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleNotificationIcon } from './SimpleNotificationIcon';

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

async function openNotifications(items: Notification[] = [], count = 0) {
  notificationsApi.getMinhasNotificacoes.mockResolvedValue(items);
  notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({ count });
  render(<SimpleNotificationIcon />);

  fireEvent.click(await screen.findByRole('button', { name: 'Notificações' }));
}

describe('SimpleNotificationIcon', () => {
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
  ])('exibe o ícone da notificação %s', async (tipo, icon) => {
    await openNotifications([createNotification({ tipo })]);

    expect(screen.getByText(icon)).toBeInTheDocument();
  });

  it('limita o badge a 99+ e pluraliza o contador do painel', async () => {
    notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({
      count: 100,
    });
    render(<SimpleNotificationIcon />);

    expect(await screen.findByText('99+')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));

    expect(await screen.findByText('100 não lidas')).toBeInTheDocument();
  });

  it.each(['Enter', ' '])(
    'marca notificação como lida pelo teclado com %s',
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

  it('não marca uma notificação já lida e fecha o painel', async () => {
    await openNotifications([createNotification({ lida: true })]);

    fireEvent.click(screen.getByRole('button', { name: /Aviso de teste/ }));

    await waitFor(() => {
      expect(notificationsApi.marcarNotificacaoComoLida).not.toHaveBeenCalled();
      expect(screen.queryByText('Aviso de teste')).not.toBeInTheDocument();
    });
  });

  it('formata data inválida com texto seguro e ignora tecla sem ação', async () => {
    await openNotifications([
      createNotification({ dataCriacao: 'data inválida' }),
    ]);
    const notification = screen
      .getByText('Aviso de teste')
      .closest('[role="button"]');

    expect(screen.getByText('Há alguns instantes')).toBeInTheDocument();
    fireEvent.keyDown(notification!, { key: 'Escape' });

    expect(notificationsApi.marcarNotificacaoComoLida).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Notificações' })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('limita a lista a dez e fecha ao solicitar a listagem completa', async () => {
    const items = Array.from({ length: 11 }, (_, index) =>
      createNotification({ id: index + 1, titulo: `Aviso ${index + 1}` })
    );
    await openNotifications(items, 11);

    expect(screen.getByText('Aviso 10')).toBeInTheDocument();
    expect(screen.queryByText('Aviso 11')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Ver todas as notificações (11)' })
    );

    expect(screen.queryByText('Aviso 1')).not.toBeInTheDocument();
  });
});
