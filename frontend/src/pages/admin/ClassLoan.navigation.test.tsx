import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
  produtos: [],
  solicitanteId: 1,
  solicitante: { id: 1, nomeCompleto: 'Mentorado da turma', email: 'b@test.invalid' },
  aprovadorId: 2,
  aprovador: null,
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-label='localizaÃ§Ã£o'>{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ClassLoan />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('ClassLoan: navegaÃ§Ã£o e estados de lista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getLoansByClass.mockResolvedValue([loan]);
  });

  it('consulta o responsÃ¡vel da turma pela query', async () => {
    renderPage('/admin/view-history-class-by-id?id=7');

    expect(await screen.findByText('Mentorado da turma')).toBeInTheDocument();
    expect(classApi.getLoansByClass).toHaveBeenCalledWith({ id: 7 });
  });

  it('normaliza state.id legado sem alterar o responsÃ¡vel selecionado', async () => {
    renderPage({ pathname: '/admin/view-history-class-by-id', state: { id: 7 } });

    expect(await screen.findByText('Mentorado da turma')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('localizaÃ§Ã£o')).toHaveTextContent(
        '/admin/view-history-class-by-id?id=7'
      )
    );
  });

  it('nÃ£o chama a API para ID invÃ¡lido e oferece retorno para usuÃ¡rios', async () => {
    renderPage('/admin/view-history-class-by-id?id=-7');

    expect(await screen.findByText('Selecione um registro para consultar')).toBeInTheDocument();
    expect(classApi.getLoansByClass).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });

  it('distingue lista vazia de erro contextual', async () => {
    classApi.getLoansByClass.mockResolvedValueOnce([]);
    renderPage('/admin/view-history-class-by-id?id=7');

    expect(await screen.findByText(/Nenhum dado/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra erro contextual em vez de converter falha em lista vazia', async () => {
    classApi.getLoansByClass.mockRejectedValueOnce(new Error('falha transitÃ³ria'));
    renderPage('/admin/view-history-class-by-id?id=7');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum dado/)).not.toBeInTheDocument();
  });
});
