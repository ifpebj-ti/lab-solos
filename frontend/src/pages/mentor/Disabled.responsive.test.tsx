import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Disabled from './Disabled';
const classApi = vi.hoisted(() => ({ getDependentes: vi.fn() }));
vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
const dependent = { id: 4201, nomeCompleto: 'Mentorado desativado', email: 'd@test.invalid', telefone: null, dataIngresso: '2026-09-01', status: 'Habilitado', nivelUsuario: 'Mentorado', tipoUsuario: 'Academico', cidade: 'Belo Jardim', curso: 'ES', instituicao: 'IFPE', responsavel: null };
describe('mentorados desativados responsivo', () => {
  beforeEach(() => { vi.clearAllMocks(); classApi.getDependentes.mockResolvedValue([dependent]); });
  it('expõe a linha com rótulos e link', async () => {
    render(<MemoryRouter><Disabled /></MemoryRouter>);
    const list = await screen.findByRole('list', { name: 'Mentorados desativados' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual(['Nome', 'Email', 'Data Desativação', 'Curso', 'Instituição', 'Ação']);
    expect(within(record).getByRole('link')).toHaveAttribute('href', '/mentor/history/mentoring');
  });
});
