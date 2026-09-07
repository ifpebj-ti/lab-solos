import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MentoringHistory from './MentoringHistory';

const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));
const loansApi = vi.hoisted(() => ({ getLoansByUserId: vi.fn() }));

vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 4101,
  nomeCompleto: 'Mentorado ' + 'M'.repeat(80),
  email: 'mentorando@example.invalid',
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
  id: 4301,
  dataRealizacao: '2026-09-06T10:00:00',
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'devolvido',
  produtos: [{ id: 1 }],
  solicitante: user,
  aprovador: null,
};

describe('histórico de mentorados responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.getUserById.mockResolvedValue(user);
    loansApi.getLoansByUserId.mockResolvedValue([loan]);
  });

  it('rotula os campos e preserva o destino do empréstimo', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/mentor/history/mentoring', state: { id: 4101 } }]}>
        <MentoringHistory />
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
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/mentor/history/loan');
  });
});
