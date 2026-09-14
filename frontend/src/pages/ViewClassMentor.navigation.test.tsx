import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ViewClassMentor from './ViewClassMentor';

const classApi = vi.hoisted(() => ({ getDependentesID: vi.fn() }));
const usersApi = vi.hoisted(() => ({ getUserById: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const user = {
  id: 7,
  nomeCompleto: 'Mentor ResponsÃ¡vel',
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

const dependent = { ...user, id: 71, nomeCompleto: 'Mentorado da turma' };

function LocationProbe() {
  const location = useLocation();
  return <output aria-label='localizaÃ§Ã£o'>{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ViewClassMentor />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('ViewClassMentor: navegaÃ§Ã£o recuperÃ¡vel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentesID.mockResolvedValue([dependent]);
    usersApi.getUserById.mockResolvedValue(user);
  });

  it('lÃª o responsÃ¡vel da query e preserva o contexto no histÃ³rico da turma', async () => {
    renderPage('/admin/view-class-mentor?id=7');

    expect(await screen.findByText('Mentor ResponsÃ¡vel')).toBeInTheDocument();
    expect(classApi.getDependentesID).toHaveBeenCalledWith('7');
    expect(usersApi.getUserById).toHaveBeenCalledWith({ id: 7 });

    fireEvent.click(screen.getByRole('button', { name: /Empr/ }));
    expect(screen.getByLabelText('localizaÃ§Ã£o')).toHaveTextContent(
      '/admin/view-history-class-by-id?id=7'
    );
  });

  it('normaliza state.id legado com replace', async () => {
    renderPage({ pathname: '/admin/view-class-mentor', state: { id: 7 } });

    expect(await screen.findByText('Mentor ResponsÃ¡vel')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('localizaÃ§Ã£o')).toHaveTextContent(
        '/admin/view-class-mentor?id=7'
      )
    );
  });

  it('nÃ£o faz GET para ID invÃ¡lido e volta para usuÃ¡rios', async () => {
    renderPage('/admin/view-class-mentor?id=0');

    expect(await screen.findByText('Selecione um registro para consultar')).toBeInTheDocument();
    expect(classApi.getDependentesID).not.toHaveBeenCalled();
    expect(usersApi.getUserById).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });
});
