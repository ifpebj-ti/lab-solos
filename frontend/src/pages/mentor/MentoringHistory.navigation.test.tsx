import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';

import MentoringHistory from './MentoringHistory';

const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));
const loansApi = vi.hoisted(() => ({ getLoansByUserId: vi.fn() }));

vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 81,
  nomeCompleto: 'Mentorado da turma',
  email: 'mentor-history@example.invalid',
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
  id: 801,
  dataRealizacao: '2026-09-02T10:00:00',
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [],
  solicitante: user,
  aprovador: null,
};

describe('MentoringHistory: navegação e falhas parciais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.getUserById.mockResolvedValue(user);
    loansApi.getLoansByUserId.mockResolvedValue([loan]);
  });

  it('lê usuário pela query e aponta Voltar para minha turma', async () => {
    render(
      <MemoryRouter initialEntries={['/mentor/history/mentoring?id=81']}>
        <MentoringHistory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Mentorado da turma')).toBeInTheDocument();
    expect(usersApi.getUserById).toHaveBeenCalledWith({ id: 81 });
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/mentor/my-class');
    expect(screen.getByRole('link', { name: '801' })).toHaveAttribute('href', '/mentor/history/loan?id=801');
  });

  it('normaliza state.id e não envia requisição antes do replace', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/mentor/history/mentoring', state: { id: 81 } }]}>
        <MentoringHistory />
      </MemoryRouter>
    );

    await waitFor(() => expect(usersApi.getUserById).toHaveBeenCalledWith({ id: 81 }));
    expect(usersApi.getUserById).toHaveBeenCalledTimes(1);
  });

  it('mantém a identidade carregada quando a lista retorna erro', async () => {
    const error = createApplicationError({
      category: 'server',
      message: 'temporarily unavailable',
      retryable: true,
      status: 500,
    });
    loansApi.getLoansByUserId.mockRejectedValue(error);

    render(
      <MemoryRouter initialEntries={['/mentor/history/mentoring?id=81']}>
        <MentoringHistory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Mentorado da turma')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/ainda não possui empréstimos/i)).not.toBeInTheDocument();
  });
});
