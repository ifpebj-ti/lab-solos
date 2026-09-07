import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ViewClassMentor from './ViewClassMentor';

const classApi = vi.hoisted(() => ({ getDependentesID: vi.fn() }));
const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 8,
  nomeCompleto: 'Mentor da Turma',
  email: 'mentor@example.test',
  telefone: '81999999999',
  dataIngresso: '2026-08-31',
  status: 'Habilitado' as const,
  nivelUsuario: 'Mentor' as const,
  tipoUsuario: 'Academico' as const,
  cidade: 'Belo Jardim',
  curso: 'Engenharia de Software',
  instituicao: 'IFPE',
  responsavel: null,
};
const dependent = {
  ...user,
  id: 81,
  nomeCompleto: 'Mentorado ' + 'C'.repeat(60),
  email: 'mentorado-mentor@example.test',
  nivelUsuario: 'Mentorado' as const,
  instituicao: 'Universidade',
};

describe('visualização de mentorados responsiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentesID.mockResolvedValue([dependent]);
    usersApi.getUserById.mockResolvedValue(user);
  });

  it('rotula os dados dos mentorados e mantém a navegação da linha', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/', state: { id: 8 } }]}>
        <ViewClassMentor />
      </MemoryRouter>
    );

    const list = await screen.findByRole('list', { name: 'Mentorados da turma' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Nome',
      'Email',
      'Instituição',
      'Curso',
    ]);
    expect(within(record).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/history/mentoring'
    );
    expect(record).toHaveTextContent('Engenharia de Software');
  });
});
