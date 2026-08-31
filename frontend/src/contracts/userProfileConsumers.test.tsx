import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDependentes } from '@/integration/Class';
import { getRegisteredUsers, getUserById } from '@/integration/Users';
import Profile from '@/pages/Profile';
import ProfileMentee from '@/pages/mentee/Profile';
import ProfileMentor from '@/pages/mentor/Profile';
import { api } from '@/services/BaseApi';

const { cookieGetMock } = vi.hoisted(() => ({ cookieGetMock: vi.fn() }));

vi.mock('@/services/BaseApi', () => ({
  api: vi.fn(),
}));

vi.mock('js-cookie', () => ({
  default: {
    get: cookieGetMock,
  },
}));

vi.mock('@/integration/Loans', () => ({
  getLoansByUserId: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/integration/Notifications', () => ({
  verificarEmprestimosVencidos: vi.fn(),
}));

vi.mock('@/components/global/OpenSearch', () => ({
  default: () => null,
}));

vi.mock('@/components/global/ButtonLogout', () => ({
  default: () => null,
}));

vi.mock('@/components/screens/FollowUp', () => ({
  default: () => null,
}));

vi.mock('@/components/screens/CardFunction', () => ({
  default: () => null,
}));

vi.mock('../../public/icons/LoadingIcon', () => ({
  default: () => null,
}));

vi.mock('../../../public/icons/LoadingIcon', () => ({
  default: () => null,
}));

vi.mock('../../../public/icons/LayersIcon', () => ({
  default: () => null,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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

const legacyAcademicUser = {
  ...academicUser,
  dataIngresso: null,
  cidade: 'Indefinido',
  curso: null,
} as const;

beforeEach(() => {
  cookieGetMock.mockReturnValue('token');
  vi.mocked(api).mockReset();
});

describe('fronteiras de usuario e dependentes', () => {
  it('valida respostas individuais e listas com o contrato compartilhado', async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ data: academicUser })
      .mockResolvedValueOnce({ data: [academicUser] })
      .mockResolvedValueOnce({ data: [legacyAcademicUser] });

    await expect(getUserById({ id: 7 })).resolves.toMatchObject({
      dataIngresso: '2024-02-29',
      cidade: 'Belo Jardim',
    });
    await expect(getRegisteredUsers()).resolves.toHaveLength(1);
    await expect(getDependentes()).resolves.toEqual([
      expect.objectContaining({ dataIngresso: null, cidade: 'Indefinido' }),
    ]);
  });

  it.each([
    { ...academicUser, dataIngresso: '2024-02-29T00:00:00Z' },
    { ...academicUser, curso: undefined },
  ])('rejeita resposta invalida sem fabricar dado substituto', async (data) => {
    vi.mocked(api).mockResolvedValue({ data });

    await expect(getUserById({ id: 7 })).rejects.toThrow();
  });
});

describe.each([
  ['administrador', Profile],
  ['mentorado', ProfileMentee],
  ['mentor', ProfileMentor],
] as const)('perfil %s', (_role, ProfileComponent) => {
  it('exibe data civil em pt-BR e preserva cidade e curso reais', async () => {
    vi.mocked(api).mockResolvedValue({ data: academicUser });

    render(<ProfileComponent />);

    expect(await screen.findByText('29/02/2024')).toBeInTheDocument();
    expect(screen.getByText('ES')).toBeInTheDocument();
    if (ProfileComponent !== Profile) {
      expect(screen.getByText('Belo Jardim')).toBeInTheDocument();
    }
    expect(screen.queryByText(/29\/02\/2024\s+00:00/)).not.toBeInTheDocument();
  });

  it('exibe legado e ausencias como Nao informado sem chamada de escrita', async () => {
    vi.mocked(api).mockResolvedValue({ data: legacyAcademicUser });

    render(<ProfileComponent />);

    await waitFor(() => {
      expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Indefinido')).not.toBeInTheDocument();
    expect(screen.queryByText('Data inválida')).not.toBeInTheDocument();
    expect(vi.mocked(api)).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' })
    );
    const requests = vi.mocked(api).mock.calls as unknown as Array<
      [{ method?: string }]
    >;
    expect(requests.every(([request]) => request.method === 'GET')).toBe(true);
  });
});
