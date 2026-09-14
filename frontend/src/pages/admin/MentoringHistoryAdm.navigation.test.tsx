import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';

import MentoringHistoryAdm from './MentoringHistoryAdm';

const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));
const loansApi = vi.hoisted(() => ({ getLoansByUserId: vi.fn() }));

vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 71,
  nomeCompleto: 'Usuário administrativo',
  email: 'admin-history@example.invalid',
  telefone: null,
  dataIngresso: '2026-09-01',
  status: 'Habilitado',
  nivelUsuario: 'Mentorado',
  tipoUsuario: 'Academico',
  cidade: 'Belo Jardim',
  curso: 'ES',
  instituicao: 'IFPE',
  responsavel: null,
};

const loan = {
  id: 701,
  dataRealizacao: '2026-09-02T10:00:00',
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [],
  solicitante: user,
  aprovador: null,
};

const notFound = createApplicationError({
  category: 'not_found',
  message: 'missing',
  retryable: false,
  status: 404,
});

const serverError = createApplicationError({
  category: 'server',
  message: 'temporarily unavailable',
  retryable: true,
  status: 500,
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}{location.search}</output>;
}

function ChangeId() {
  const navigate = useNavigate();
  return (
    <button type='button' onClick={() => navigate('/admin/history/mentoring?id=72')}>
      trocar registro
    </button>
  );
}

describe('MentoringHistoryAdm: navegação e estados de consulta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.getUserById.mockResolvedValue(user);
    loansApi.getLoansByUserId.mockResolvedValue([loan]);
  });

  it('usa o id da query e normaliza state.id legado com replace', async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={[{ pathname: '/admin/history/mentoring', search: '?tab=all', state: { id: 71 } }]}>
        <MentoringHistoryAdm />
        <LocationProbe />
      </MemoryRouter>
    );

    expect(await screen.findByText('Usuário administrativo')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/history/mentoring?tab=all&id=71');
    expect(usersApi.getUserById).toHaveBeenCalledWith({ id: 71 });
    expect(loansApi.getLoansByUserId).toHaveBeenCalledWith({ id: 71 });
    rerender(
      <MemoryRouter initialEntries={['/admin/history/mentoring?id=71']}>
        <MentoringHistoryAdm />
      </MemoryRouter>
    );
  });

  it('não consulta id inválido e oferece retorno para usuários', () => {
    render(
      <MemoryRouter initialEntries={['/admin/history/mentoring?id=0']}>
        <MentoringHistoryAdm />
      </MemoryRouter>
    );

    expect(screen.getByText('Selecione um registro para consultar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/admin/users');
    expect(usersApi.getUserById).not.toHaveBeenCalled();
    expect(loansApi.getLoansByUserId).not.toHaveBeenCalled();
  });

  it('preserva o usuário quando empréstimos falham e recupera pelo retry', async () => {
    loansApi.getLoansByUserId.mockRejectedValueOnce(serverError).mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/admin/history/mentoring?id=71']}>
        <MentoringHistoryAdm />
      </MemoryRouter>
    );

    expect(await screen.findByText('Usuário administrativo')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/ainda não possui empréstimos/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText(/ainda não possui empréstimos/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Usuário administrativo')).toBeInTheDocument();
  });

  it('mantém erro de usuário inexistente sem inventar lista vazia', async () => {
    usersApi.getUserById.mockRejectedValue(notFound);

    render(
      <MemoryRouter initialEntries={['/admin/history/mentoring?id=999']}>
        <MentoringHistoryAdm />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/ainda não possui empréstimos/i)).not.toBeInTheDocument();
    expect(loansApi.getLoansByUserId).not.toHaveBeenCalled();
  });

  it('descarta a resposta do id anterior após troca de rota', async () => {
    const resolvers = new Map<number, (value: typeof user) => void>();
    usersApi.getUserById.mockImplementation(({ id }: { id: number }) =>
      new Promise((resolve) => resolvers.set(id, resolve))
    );
    loansApi.getLoansByUserId.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/admin/history/mentoring?id=71']}>
        <MentoringHistoryAdm />
        <ChangeId />
      </MemoryRouter>
    );

    await waitFor(() => expect(usersApi.getUserById).toHaveBeenCalledWith({ id: 71 }));
    fireEvent.click(screen.getByRole('button', { name: 'trocar registro' }));
    await waitFor(() => expect(usersApi.getUserById).toHaveBeenCalledWith({ id: 72 }));

    resolvers.get(71)?.({ ...user, nomeCompleto: 'Resposta obsoleta' });
    resolvers.get(72)?.({ ...user, id: 72, nomeCompleto: 'Resposta atual' });

    expect(await screen.findByText('Resposta atual')).toBeInTheDocument();
    expect(screen.queryByText('Resposta obsoleta')).not.toBeInTheDocument();
  });
});
