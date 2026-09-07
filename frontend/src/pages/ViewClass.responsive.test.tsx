import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ViewClass from './ViewClass';

const classApi = vi.hoisted(() => ({ getDependentesID: vi.fn() }));
const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 7,
  nomeCompleto: 'Gestora da Turma',
  email: 'gestora@example.test',
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
  id: 71,
  nomeCompleto: 'Mentorado ' + 'B'.repeat(60),
  email: 'mentorado@example.test',
  nivelUsuario: 'Mentorado' as const,
  instituicao: 'Universidade',
};

describe('visualização de turma responsiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentesID.mockResolvedValue([dependent]);
    usersApi.getUserById.mockResolvedValue(user);
  });

  it('rotula os dados dos integrantes e preserva o link por ID', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/', state: { id: 7 } }]}>
        <ViewClass />
      </MemoryRouter>
    );

    const list = await screen.findByRole('list', { name: 'Usuários da turma' });
    const record = within(list).getByRole('listitem');
    expect(Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Nome',
      'Email',
      'Instituição',
      'Curso',
      'Status',
    ]);
    expect(within(record).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/view-class-mentor'
    );
    expect(record).toHaveTextContent('Mentorado');
  });
});
