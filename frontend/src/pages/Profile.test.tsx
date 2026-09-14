import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserById } from '@/integration/Users';
import { verificarEmprestimosVencidos } from '@/integration/Notifications';
import { toast } from '@/components/hooks/use-toast';
import Profile from '@/pages/Profile';

const {
  cookieGetMock,
  getUserByIdMock,
  verificarEmprestimosVencidosMock,
  toastMock,
} = vi.hoisted(() => ({
  cookieGetMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  verificarEmprestimosVencidosMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('js-cookie', () => ({
  default: {
    get: cookieGetMock,
  },
}));

vi.mock('@/integration/Users', () => ({
  getUserById: getUserByIdMock,
}));

vi.mock('@/integration/Notifications', () => ({
  verificarEmprestimosVencidos: verificarEmprestimosVencidosMock,
}));

vi.mock('@/components/hooks/use-toast', () => ({
  toast: toastMock,
}));

vi.mock('@/components/global/OpenSearch', () => ({
  default: () => null,
}));

vi.mock('../../public/icons/LoadingIcon', () => ({
  default: () => null,
}));

const user = {
  id: 7,
  nomeCompleto: 'Ada Lovelace',
  email: 'ada@example.com',
  telefone: null,
  dataIngresso: '2024-02-29',
  status: 'Habilitado',
  nivelUsuario: 'Administrador',
  tipoUsuario: 'Administrador',
} as const;

const renderProfile = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

beforeEach(() => {
  cookieGetMock.mockReturnValue('7');
  getUserByIdMock.mockResolvedValue(user);
  verificarEmprestimosVencidosMock.mockResolvedValue({
    message: 'Nenhum empréstimo vencido encontrado.',
  });
  toastMock.mockReset();
});

describe('Profile', () => {
  it('carrega os dados da conta sem importação ou comunicação InterLab', async () => {
    renderProfile();

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(getUserById).toHaveBeenCalledWith({ id: '7' });
    expect(screen.queryByText(/Comunicação InterLab/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Importar Planilha de Cadastro de Bens/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('preserva o estado pendente e a notificação de sucesso dos empréstimos vencidos', async () => {
    let resolveVerification: (value: { message: string }) => void = () => {};
    verificarEmprestimosVencidosMock.mockReturnValue(
      new Promise((resolve) => {
        resolveVerification = resolve;
      })
    );

    renderProfile();
    await screen.findByText('Ada Lovelace');
    fireEvent.click(screen.getByRole('link', { name: /Verificar/ }));

    expect(await screen.findByText('Verificando...')).toBeInTheDocument();
    expect(verificarEmprestimosVencidos).toHaveBeenCalledTimes(1);

    resolveVerification({ message: 'Nenhum empréstimo vencido encontrado.' });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Sucesso',
        description: 'Nenhum empréstimo vencido encontrado.',
        variant: 'default',
      });
    });
    expect(screen.getByRole('link', { name: /Verificar/ })).toBeInTheDocument();
  });

  it('preserva a notificação de erro dos empréstimos vencidos', async () => {
    verificarEmprestimosVencidosMock.mockRejectedValue(new Error('falha'));

    renderProfile();
    await screen.findByText('Ada Lovelace');
    fireEvent.click(screen.getByRole('link', { name: /Verificar/ }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Erro',
        description: expect.any(String),
        variant: 'destructive',
      });
    });
    expect(screen.getByRole('link', { name: /Verificar/ })).toBeInTheDocument();
  });
});
