import Cookie from 'js-cookie';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';

import HistoryMentoring from './HistoryMentoring';

const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));
const loansApi = vi.hoisted(() => ({ getLoansByUserId: vi.fn() }));

vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 91,
  nomeCompleto: 'Identidade da sessão',
  email: 'mentee-history@example.invalid',
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

describe('HistoryMentoring: identidade da sessão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Cookie.set('rankID', '91');
    usersApi.getUserById.mockResolvedValue(user);
    loansApi.getLoansByUserId.mockResolvedValue([]);
  });

  it('ignora id arbitrário da query e usa o rankID da sessão', async () => {
    render(
      <MemoryRouter initialEntries={['/mentee/history/mentoring?id=999']}>
        <HistoryMentoring />
      </MemoryRouter>
    );

    expect(await screen.findByText('Identidade da sessão')).toBeInTheDocument();
    expect(usersApi.getUserById).toHaveBeenCalledWith({ id: '91' });
    expect(loansApi.getLoansByUserId).toHaveBeenCalledWith({ id: '91' });
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/mentee/');
    expect(await screen.findByText(/ainda não possui empréstimos/i)).toBeInTheDocument();
  });

  it('não transforma falha dos empréstimos em vazio e mantém a identidade', async () => {
    loansApi.getLoansByUserId.mockRejectedValue(
      createApplicationError({
        category: 'server',
        message: 'temporarily unavailable',
        retryable: true,
        status: 500,
      })
    );

    render(
      <MemoryRouter initialEntries={['/mentee/history/mentoring']}>
        <HistoryMentoring />
      </MemoryRouter>
    );

    expect(await screen.findByText('Identidade da sessão')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/ainda não possui empréstimos/i)).not.toBeInTheDocument();
  });
});
