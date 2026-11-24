import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationIcon } from './NotificationIcon';
import { SidebarNotificationButton } from './SidebarNotificationButton';
import { SimpleNotificationIcon } from './SimpleNotificationIcon';

const notificationsApi = vi.hoisted(() => ({
  getMinhasNotificacoes: vi.fn(),
  getCountNotificacoesNaoLidas: vi.fn(),
  marcarNotificacaoComoLida: vi.fn(),
  marcarVariasNotificacoesComoLidas: vi.fn(),
}));

vi.mock('@/integration/Notifications', () => notificationsApi);

type NotificationIconComponent = ComponentType<object>;
const notificationIcons: [string, NotificationIconComponent][] = [
  ['ícone principal', NotificationIcon],
  ['ícone simples', SimpleNotificationIcon],
  ['ícone da barra lateral', SidebarNotificationButton],
];

type Recipient = 'destinatario-a' | 'destinatario-b';
type TestNotification = {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  tipoTexto: string;
  lida: boolean;
  dataCriacao: string;
  dataLeitura?: string;
};

const originalNotification = (recipient: Recipient): TestNotification => ({
  id: 5,
  titulo: `Aviso de ${recipient}`,
  mensagem: 'Mensagem sintética',
  tipo: 'Sistema',
  tipoTexto: 'Sistema',
  lida: false,
  dataCriacao: '2026-11-23T12:00:00.000Z',
});

let activeRecipient: Recipient;
let recipientNotifications: Map<Recipient, TestNotification[]>;

function openNotifications() {
  fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
}

describe('leitura de notificações por destinatário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeRecipient = 'destinatario-a';
    recipientNotifications = new Map([
      ['destinatario-a', [originalNotification('destinatario-a')]],
      ['destinatario-b', [originalNotification('destinatario-b')]],
    ]);

    notificationsApi.getMinhasNotificacoes.mockImplementation(async () =>
      (recipientNotifications.get(activeRecipient) ?? []).map((item) => ({
        ...item,
      }))
    );
    notificationsApi.getCountNotificacoesNaoLidas.mockImplementation(
      async () => ({
        count: (recipientNotifications.get(activeRecipient) ?? []).filter(
          (item) => !item.lida
        ).length,
      })
    );
    notificationsApi.marcarNotificacaoComoLida.mockImplementation(
      async (notificationId: number) => {
        recipientNotifications.set(
          activeRecipient,
          (recipientNotifications.get(activeRecipient) ?? []).map((item) =>
            item.id === notificationId
              ? { ...item, lida: true, dataLeitura: '2026-11-23T12:01:00.000Z' }
              : item
          )
        );
      }
    );
    notificationsApi.marcarVariasNotificacoesComoLidas.mockResolvedValue(
      undefined
    );
  });

  it.each(notificationIcons)(
    '%s apresenta uma lista vazia com contador zerado',
    async (_name, Icon) => {
      recipientNotifications.set('destinatario-a', []);
      notificationsApi.getCountNotificacoesNaoLidas.mockResolvedValue({
        count: 0,
      });

      render(<Icon />);
      openNotifications();

      expect(await screen.findByText('Nenhuma notificação')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
      expect(notificationsApi.getCountNotificacoesNaoLidas).toHaveBeenCalled();
    }
  );

  it.each(notificationIcons)(
    '%s mostra falha de consulta separada do estado vazio',
    async (_name, Icon) => {
      notificationsApi.getMinhasNotificacoes.mockRejectedValue(
        new Error('detalhe interno não deve aparecer')
      );

      render(<Icon />);
      openNotifications();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível carregar as notificações'
      );
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível concluir a operação.'
      );
      expect(screen.queryByText('Nenhuma notificação')).not.toBeInTheDocument();
      expect(
        screen.queryByText('detalhe interno não deve aparecer')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    }
  );

  it.each(notificationIcons)(
    '%s atualiza somente a leitura e a contagem da sessão ativa',
    async (_name, Icon) => {
      const { unmount } = render(<Icon />);
      openNotifications();

      fireEvent.click(await screen.findByText('Aviso de destinatario-a'));

      await waitFor(() => {
        expect(notificationsApi.marcarNotificacaoComoLida).toHaveBeenCalledWith(5);
        expect(recipientNotifications.get('destinatario-a')?.[0].lida).toBe(true);
        expect(screen.queryByText('1')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Não lida')).not.toBeInTheDocument();
      });

      unmount();
      activeRecipient = 'destinatario-b';
      render(<Icon />);
      openNotifications();

      expect(await screen.findByText('Aviso de destinatario-b')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByLabelText('Não lida')).toBeInTheDocument();
      expect(recipientNotifications.get('destinatario-b')?.[0].lida).toBe(false);
    }
  );
});
