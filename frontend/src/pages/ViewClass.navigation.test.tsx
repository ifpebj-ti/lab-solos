import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
  nomeCompleto: 'Mentorado da turma',
  nivelUsuario: 'Mentorado' as const,
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-label='localizaÃ§Ã£o'>{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ViewClass />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('ViewClass: navegaÃ§Ã£o recuperÃ¡vel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentesID.mockResolvedValue([dependent]);
    usersApi.getUserById.mockResolvedValue(user);
  });

  it('lÃª o responsÃ¡vel pela query ao abrir por link direto', async () => {
    renderPage('/admin/view-class?id=7');

    expect(await screen.findByText('Gestora da Turma')).toBeInTheDocument();
    expect(classApi.getDependentesID).toHaveBeenCalledWith('7');
    expect(usersApi.getUserById).toHaveBeenCalledWith({ id: 7 });
  });

  it('normaliza state.id legado para a query sem perder o responsÃ¡vel', async () => {
    renderPage({ pathname: '/admin/view-class', state: { id: 7 } });

    expect(await screen.findByText('Gestora da Turma')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('localizaÃ§Ã£o')).toHaveTextContent(
        '/admin/view-class?id=7'
      )
    );
    expect(classApi.getDependentesID).toHaveBeenCalledWith('7');
  });

  it('nÃ£o consulta sem ID vÃ¡lido e oferece retorno para usuÃ¡rios', async () => {
    renderPage('/admin/view-class?id=abc');

    expect(await screen.findByText('Selecione um registro para consultar')).toBeInTheDocument();
    expect(classApi.getDependentesID).not.toHaveBeenCalled();
    expect(usersApi.getUserById).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });
});
