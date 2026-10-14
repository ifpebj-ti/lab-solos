import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserById } from '@/integration/Users';
import { verificarEmprestimosVencidos } from '@/integration/Notifications';
import { toast } from '@/components/hooks/use-toast';
import Profile from '@/pages/Profile';
import ProfileMentor from '@/pages/mentor/Profile';
import ProfileMentee from '@/pages/mentee/Profile';

const {
  cookieGetMock,
  getUserByIdMock,
  updateOwnUserProfileMock,
  getLoansByUserIdMock,
  verificarEmprestimosVencidosMock,
  toastMock,
} = vi.hoisted(() => ({
  cookieGetMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  updateOwnUserProfileMock: vi.fn(),
  getLoansByUserIdMock: vi.fn(),
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
  updateOwnUserProfile: updateOwnUserProfileMock,
}));

vi.mock('@/integration/Loans', () => ({
  getLoansByUserId: getLoansByUserIdMock,
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

vi.mock('@/components/global/ButtonLogout', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({ default: () => null }));
vi.mock('../../../public/icons/LayersIcon', () => ({ default: () => null }));

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

const academicUser = {
  id: 7,
  nomeCompleto: 'Ada Lovelace',
  email: 'ada@example.com',
  telefone: null,
  dataIngresso: '2024-02-29',
  status: 'Habilitado',
  nivelUsuario: 'Mentor',
  tipoUsuario: 'Academico',
  responsavel: null,
  instituicao: 'IFPE',
  cidade: 'Belo Jardim',
  curso: 'ES',
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
  updateOwnUserProfileMock.mockResolvedValue(undefined);
  getLoansByUserIdMock.mockResolvedValue([]);
  toastMock.mockReset();
});

describe('Profile', () => {
  it('apresenta erro recuperável quando não carrega os dados do perfil', async () => {
    getUserByIdMock.mockRejectedValue({ response: { status: 503 } });

    renderProfile();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Não foi possível carregar o usuário/
    );
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' })
    ).toBeInTheDocument();
  });

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

  it('permite iniciar a edição do próprio perfil', async () => {
    renderProfile();

    await screen.findByText('Ada Lovelace');

    expect(
      screen.getByRole('button', { name: 'Editar meus dados' })
    ).toBeInTheDocument();
  });

  it('salva nome próprio e atualiza os dados exibidos', async () => {
    renderProfile();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar meus dados' })
    );
    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Ada Byron' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Ada Byron')).toBeInTheDocument();
    expect(updateOwnUserProfileMock).toHaveBeenCalledWith({
      userId: 7,
      currentName: 'Ada Lovelace',
      currentEmail: 'ada@example.com',
      currentPhone: null,
      nomeCompleto: 'Ada Byron',
      email: 'ada@example.com',
      telefone: null,
    });
  });

  it('alinha os dados do perfil em painéis consistentes e não duplica telefone', async () => {
    renderProfile();

    await screen.findByText('Ada Lovelace');

    const identityPanel = screen.getByText('Nome').parentElement?.parentElement;
    const detailsPanel =
      screen.getByText('Telefone').parentElement?.parentElement;

    expect(identityPanel).toHaveClass('sm:grid-cols-2', 'lg:w-full');
    expect(detailsPanel).toHaveClass('sm:grid-cols-2', 'lg:w-full');
    expect(screen.getAllByText('Telefone')).toHaveLength(1);
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

describe.each([
  ['mentor', ProfileMentor, { ...academicUser, nivelUsuario: 'Mentor' }],
  ['mentorado', ProfileMentee, { ...academicUser, nivelUsuario: 'Mentorado' }],
] as const)('%s editando o próprio perfil', (_role, ProfileComponent, profile) => {
  it('oferece edição de contato sem expor controle de status', async () => {
    getUserByIdMock.mockResolvedValue(profile);
    render(
      <MemoryRouter>
        <ProfileComponent />
      </MemoryRouter>
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar meus dados' })
    );
    expect(
      screen.getByRole('form', { name: 'Editar meu perfil' })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });
});
