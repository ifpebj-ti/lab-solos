import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HistoryMentoring from './HistoryMentoring';

const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));
const loansApi = vi.hoisted(() => ({ getLoansByUserId: vi.fn() }));
const cookieApi = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('js-cookie', () => ({ default: cookieApi }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 4242,
  nomeCompleto: 'Pessoa Sintética',
  email: 'sessao@example.invalid',
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
  id: 4401,
  dataRealizacao: '2026-09-06T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '',
  status: 'Pendente',
  produtos: [{ id: 1 }],
  solicitanteId: 4242,
  solicitante: null,
  aprovadorId: 4242,
  aprovador: null,
};

describe('histórico de mentorias do mentorado responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieApi.get.mockReturnValue('4242');
    usersApi.getUserById.mockResolvedValue(user);
    loansApi.getLoansByUserId.mockResolvedValue([loan]);
  });

  it('rotula os campos e preserva o destino do empréstimo', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/mentee/history/mentoring' }] }>
        <HistoryMentoring />
      </MemoryRouter>
    );
    const list = await screen.findByRole('list', { name: 'Histórico de mentorados' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Id',
      'Data',
      'Itens Utilizados',
      'Status',
    ]);
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/mentee/history/loan');
  });
});
