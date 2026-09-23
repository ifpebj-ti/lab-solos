import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { getUserById } from '@/integration/Users';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AppSidebar } from './app-sidebar';
import { SidebarProvider } from './sidebar';

vi.mock('@/integration/Users', () => ({
  getUserById: vi.fn(),
}));

vi.mock('@/integration/Notifications', () => ({
  getMinhasNotificacoes: vi.fn().mockResolvedValue([]),
  getCountNotificacoesNaoLidas: vi.fn().mockResolvedValue({ count: 0 }),
  marcarNotificacaoComoLida: vi.fn().mockResolvedValue(undefined),
  marcarVariasNotificacoesComoLidas: vi.fn().mockResolvedValue(undefined),
}));

const getUserByIdMock = vi.mocked(getUserById);

function makeUser(nivelUsuario: 'Administrador' | 'Comum') {
  return {
    id: 1,
    nomeCompleto: 'Usuário Sintético',
    email: 'usuario@example.test',
    telefone: null,
    dataIngresso: '2026-09-01',
    status: 'Habilitado' as const,
    nivelUsuario,
    tipoUsuario: 'Comum' as const,
    responsavel: null,
  };
}

function renderSidebar(nivelUsuario: 'Administrador' | 'Comum') {
  getUserByIdMock.mockResolvedValue(makeUser(nivelUsuario));

  return render(
    <MemoryRouter initialEntries={['/']}>
      <SidebarProvider>
        <ThemeProvider>
          <AppSidebar />
        </ThemeProvider>
      </SidebarProvider>
    </MemoryRouter>
  );
}

function openUserMenu() {
  const trigger = screen.getByRole('button', { name: /Usuário Sintético/i });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter' });
}

describe('AppSidebar', () => {
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
    document.cookie = 'rankID=1';
  });

  it('não exibe Extras, Comunicação InterLab ou grupos vazios', async () => {
    renderSidebar('Administrador');

    await waitFor(() =>
      expect(screen.getByText('Usuário Sintético')).toBeInTheDocument()
    );

    expect(screen.queryByText('Extras')).not.toBeInTheDocument();
    expect(screen.queryByText(/InterLab/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /view-info/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Produtos')).toBeInTheDocument();
    expect(screen.getByText('Usuários')).toBeInTheDocument();
    expect(screen.getByText('Emprestimos')).toBeInTheDocument();
  });

  it('mostra uma mensagem e permite repetir quando falha ao carregar a conta', async () => {
    getUserByIdMock.mockRejectedValue({ response: { status: 503 } });
    render(
      <MemoryRouter initialEntries={['/']}>
        <SidebarProvider>
          <ThemeProvider>
            <AppSidebar />
          </ThemeProvider>
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Não foi possível carregar o usuário/
    );
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' })
    ).toBeInTheDocument();
  });

  it('exibe o alternador de tema dentro da navegaÃ§Ã£o', async () => {
    renderSidebar('Administrador');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Mudar para tema/i })
      ).toBeInTheDocument()
    );
  });

  it('não expõe links órfãos nem ações administrativas para Comum', async () => {
    getUserByIdMock.mockResolvedValue(makeUser('Comum'));
    renderSidebar('Comum');

    await waitFor(() =>
      expect(screen.getByText('Usuário Sintético')).toBeInTheDocument()
    );

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByText('Produtos')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
    expect(screen.queryByText('Emprestimos')).not.toBeInTheDocument();
    expect(screen.queryByText('Auditoria')).not.toBeInTheDocument();

    openUserMenu();
    expect(
      screen.queryByRole('menuitem', { name: 'Conta' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  });
});
