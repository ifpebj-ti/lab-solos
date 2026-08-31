import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegistrationRequest from '@/pages/RegistrationRequests';
import ViewClass from '@/pages/ViewClass';
import MyClass from '@/pages/mentor/MyClass';

const classApi = vi.hoisted(() => ({
  getDependentes: vi.fn(),
  getDependentesForApproval: vi.fn(),
  getDependentesID: vi.fn(),
  approveDependente: vi.fn(),
  rejectDependente: vi.fn(),
}));

const usersApi = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/integration/Users', () => usersApi);
vi.mock('js-cookie', () => ({ default: { get: () => '10' } }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/global/table/Header', () => ({ default: () => null }));
vi.mock('@/components/global/table/Pagination', () => ({ default: () => null }));
vi.mock('@/components/global/inputs/SearchInput', () => ({ default: () => null }));
vi.mock('@/components/global/table/TopDown', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({ default: () => null }));
vi.mock('@/components/global/table/ItemClickable', () => ({
  default: ({ data }: { data: string[] }) => <div>{data.join('|')}</div>,
}));
vi.mock('@/components/global/table/ItemButton', () => ({
  default: ({ data }: { data: string[] }) => <div>{data.join('|')}</div>,
}));

const academicUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  nomeCompleto: 'Ana Silva',
  email: 'ana@example.test',
  telefone: null,
  dataIngresso: '2026-08-31',
  status: 'Habilitado',
  nivelUsuario: 'Mentorado',
  tipoUsuario: 'Academico',
  cidade: 'Belo Jardim',
  curso: 'ES',
  instituicao: 'IFPE',
  responsavel: null,
  ...overrides,
});

const renderAt = (component: React.ReactNode, state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/', state }]}>
      {component}
    </MemoryRouter>
  );

describe('consumidores de listas e turmas de usuário', () => {
  beforeEach(() => {
    classApi.getDependentes.mockReset();
    classApi.getDependentesForApproval.mockReset();
    classApi.getDependentesID.mockReset();
    usersApi.getUserById.mockReset();
  });

  it('formata data civil na lista sem acrescentar horário', async () => {
    classApi.getDependentes.mockResolvedValue([academicUser()]);

    renderAt(<MyClass />);

    expect(await screen.findByText(/31\/08\/2026/)).toHaveTextContent(
      '31/08/2026'
    );
    expect(screen.queryByText(/31\/08\/2026 00:00/)).not.toBeInTheDocument();
  });

  it('mostra data nula como Não informado na aprovação', async () => {
    classApi.getDependentesForApproval.mockResolvedValue([
      academicUser({ dataIngresso: null, status: 'Pendente' }),
    ]);

    renderAt(<RegistrationRequest />);

    expect(await screen.findByText(/Não informado/)).toBeInTheDocument();
    expect(screen.queryByText(/Data inválida/)).not.toBeInTheDocument();
  });

  it('preserva cidade real e data civil no detalhe da turma', async () => {
    classApi.getDependentesID.mockResolvedValue([]);
    usersApi.getUserById.mockResolvedValue(academicUser());

    renderAt(<ViewClass />, { id: 1 });

    expect(await screen.findByText('Belo Jardim')).toBeInTheDocument();
    expect(screen.getByText('31/08/2026')).toBeInTheDocument();
  });

  it('traduz cidade sentinela, curso e data ausentes no detalhe legado', async () => {
    classApi.getDependentesID.mockResolvedValue([]);
    usersApi.getUserById.mockResolvedValue(
      academicUser({ cidade: 'Indefinido', curso: null, dataIngresso: null })
    );

    renderAt(<ViewClass />, { id: 1 });

    await waitFor(() => expect(screen.getByText('Cidade')).toBeInTheDocument());
    expect(screen.queryByText('Indefinido')).not.toBeInTheDocument();
    expect(screen.queryByText(/Não Corresponde/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Não informado')).toHaveLength(4);
  });
});
