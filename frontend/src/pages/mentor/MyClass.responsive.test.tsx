import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyClass from './MyClass';
const classApi = vi.hoisted(() => ({ getDependentes: vi.fn() }));
vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
const dependent = { id: 4101, nomeCompleto: 'Mentorado ' + 'M'.repeat(80), email: 'm@test.invalid', telefone: null, dataIngresso: '2026-09-01', status: 'Habilitado', nivelUsuario: 'Mentorado', tipoUsuario: 'Academico', cidade: 'Belo Jardim', curso: 'ES', instituicao: 'IFPE', responsavel: null };
describe('minha turma responsiva', () => {
  beforeEach(() => { vi.clearAllMocks(); classApi.getDependentes.mockResolvedValue([dependent]); });
  it('rotula os seis campos e preserva o destino', async () => {
    render(<MemoryRouter><MyClass /></MemoryRouter>);
    const list = await screen.findByRole('list', { name: 'Minha turma' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual(['Nome', 'Email', 'Data Ingresso', 'Curso', 'Instituição', 'Status']);
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/mentor/history/mentoring');
  });
});
