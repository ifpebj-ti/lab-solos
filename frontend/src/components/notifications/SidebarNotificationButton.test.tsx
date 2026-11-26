import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Notificacao } from '@/integration/Notifications';
import { SidebarNotificationButton } from './SidebarNotificationButton';

const notificationsApi = vi.hoisted(() => ({
  getMinhasNotificacoes: vi.fn(),
  getCountNotificacoesNaoLidas: vi.fn(),
  marcarNotificacaoComoLida: vi.fn(),
  marcarVariasNotificacoesComoLidas: vi.fn(),
}));

vi.mock('@/integration/Notifications', () => notificationsApi);

const createNotification = (
  overrides: Partial<Notificacao> = {}
): Notificacao => ({
  id: 42,
  titulo: 'Aviso de teste',
  mensagem: 'Mensagem sintética',
  tipo: 'Sistema',
  tipoTexto: 'Sistema',
  lida: false,
  dataCriacao: '2026-11-24T12:00:00.000Z',
  ...overrides,
});

function renderButton() {
  return render(<SidebarNotificationButton />);
}

function openNotifications() {
  fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
}

describe('SidebarNotificationButton', () => {
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
  ])('exibe o ícone esperado para %s', async (tipo, icone) => {
    notificationsApi.getMinhasNotificacoes.mockResolvedValue([
      createNotification({ tipo, lida: true }),
    ]);
    renderButton();
    openNotifications();

    expect(await screen.findByText(icone)).toBeInTheDocument();
  });

  it.each([
    [1, '1 não lida'],
    [2, '2 não lidas'],
  ])('formata corretamente o total de não lidas (%i)', async (count, expected) => {
    notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({ count });
    renderButton();
    openNotifications();

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('limita o contador do botão a 99+', async () => {
    notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({
      count: 120,
    });

    renderButton();

    expect(await screen.findByText('99+')).toBeInTheDocument();
  });

  it('mantém o estado de carregamento até as consultas terminarem', async () => {
    let finishNotifications!: (value: Notificacao[]) => void;
    let finishCount!: (value: { count: number }) => void;
    notificationsApi.getMinhasNotificacoes.mockImplementation(
      () => new Promise((resolve) => (finishNotifications = resolve))
    );
    notificationsApi.getCountNotificacoesNaoLidas.mockImplementation(
      () => new Promise((resolve) => (finishCount = resolve))
    );

    renderButton();
    openNotifications();

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    finishNotifications([]);
    finishCount({ count: 0 });

    expect(await screen.findByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('exibe e fecha a ação para ver todas quando há mais de dez itens', async () => {
    notificationsApi.getMinhasNotificacoes.mockResolvedValue(
      Array.from({ length: 11 }, (_, index) =>
        createNotification({ id: index + 1, titulo: `Aviso ${index + 1}` })
      )
    );

    renderButton();
    openNotifications();

    const viewAll = await screen.findByRole('button', {
      name: 'Ver todas as notificações (11)',
    });
    expect(screen.getByRole('button', { name: /Aviso 10/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aviso 11/ })).not.toBeInTheDocument();
    fireEvent.click(viewAll);

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Ver todas as notificações (11)' })
      ).not.toBeInTheDocument()
    );
  });

  it.each(['Enter', ' '])(
    'marca uma notificação não lida pelo teclado com %s',
    async (key) => {
      notificationsApi.getMinhasNotificacoes.mockResolvedValue([
        createNotification(),
      ]);
      renderButton();
      openNotifications();

      const notification = await screen.findByRole('button', {
        name: /Aviso de teste/,
      });
      fireEvent.keyDown(notification, { key });

      await waitFor(() =>
        expect(notificationsApi.marcarNotificacaoComoLida).toHaveBeenCalledWith(
          42
        )
      );
    }
  );

  it('ignora teclas que não ativam a notificação', async () => {
    notificationsApi.getMinhasNotificacoes.mockResolvedValue([
      createNotification(),
    ]);
    renderButton();
    openNotifications();

    fireEvent.keyDown(await screen.findByRole('button', { name: /Aviso de teste/ }), {
      key: 'Escape',
    });

    expect(notificationsApi.marcarNotificacaoComoLida).not.toHaveBeenCalled();
  });

  it('fecha sem marcar uma notificação que já está lida', async () => {
    notificationsApi.getMinhasNotificacoes.mockResolvedValue([
      createNotification({ lida: true }),
    ]);
    renderButton();
    openNotifications();

    fireEvent.click(await screen.findByText('Aviso de teste'));

    await waitFor(() => {
      expect(notificationsApi.marcarNotificacaoComoLida).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('heading', { name: 'Notificações' })
      ).not.toBeInTheDocument();
    });
  });

  it('usa um texto seguro quando a data da notificação é inválida', async () => {
    notificationsApi.getMinhasNotificacoes.mockResolvedValue([
      createNotification({ dataCriacao: 'data inválida' }),
    ]);
    renderButton();
    openNotifications();

    expect(await screen.findByText('Há alguns instantes')).toBeInTheDocument();
  });
});
