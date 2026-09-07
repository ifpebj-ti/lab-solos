import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MentoringHistoryAdm from './MentoringHistoryAdm';

const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));
const loansApi = vi.hoisted(() => ({ getLoansByUserId: vi.fn() }));
vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/integration/Loans', () => loansApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 3201,
  nomeCompleto: 'Mentorado',
  email: 'mentorado@test.invalid',
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
  id: 3202,
  dataRealizacao: '2026-09-02T10:00:00',
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [{ id: 1 }],
  solicitante: user,
  aprovador: null,
};

describe('histórico de mentorados administrativo responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.getUserById.mockResolvedValue(user);
    loansApi.getLoansByUserId.mockResolvedValue([loan]);
  });

  it('mantém os quatro campos rotulados e o destino da linha', async () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/', state: { id: 3201 } }]}><MentoringHistoryAdm /></MemoryRouter>);
    const list = await screen.findByRole('list', { name: 'Histórico de mentorados' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Código', 'Data de Uso', 'Quant. Itens Utilizados', 'Status',
    ]);
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/admin/history/loan');
  });
});
