import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClassLoan from './ClassLoan';

const classApi = vi.hoisted(() => ({ getLoansByClass: vi.fn() }));
vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const loan = {
  id: 3101,
  dataRealizacao: '2026-09-01T10:00:00',
  dataDevolucao: null,
  dataAprovacao: '2026-09-01T11:00:00',
  status: 'devolvido',
  emprestimoProdutos: [{ id: 1 }],
  solicitanteId: 1,
  solicitante: { id: 1, nomeCompleto: 'Mentorado ' + 'B'.repeat(60), email: 'b@test.invalid' },
  aprovadorId: 2,
  aprovador: null,
};

describe('empréstimos da turma responsivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getLoansByClass.mockResolvedValue([loan]);
  });

  it('mantém rótulos, filtro e navegação do empréstimo', async () => {
    render(<MemoryRouter initialEntries={['/admin/class-loan']}><ClassLoan /></MemoryRouter>);
    const list = await screen.findByRole('list', { name: 'Histórico de empréstimos da turma' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Id', 'Mentorado Vinculado', 'Data', 'Itens Utilizados', 'Status',
    ]);
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/admin/history/loan');
  });
});
