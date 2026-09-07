import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistoryClass from './HistoryClass';
const classApi = vi.hoisted(() => ({ getLoansByDependentes: vi.fn() }));
vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
const loan = { id: 4301, dataRealizacao: '2026-09-01T10:00:00', dataDevolucao: null, dataAprovacao: null, status: 'devolvido', produtos: [{ id: 1 }], solicitante: { id: 1, nomeCompleto: 'Mentorado ' + 'H'.repeat(80), email: 'h@test.invalid' }, aprovador: null };
describe('histórico da turma responsivo', () => {
  beforeEach(() => { vi.clearAllMocks(); classApi.getLoansByDependentes.mockResolvedValue([loan]); });
  it('rotula os campos e preserva o destino', async () => {
    render(<MemoryRouter><HistoryClass /></MemoryRouter>);
    const list = await screen.findByRole('list', { name: 'Histórico da turma' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual(['Id', 'Mentorado Vinculado', 'Data', 'Itens Utilizados', 'Status']);
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/mentor/history/loan');
  });
});
