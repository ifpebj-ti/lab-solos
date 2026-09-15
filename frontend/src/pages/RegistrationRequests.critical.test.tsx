import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Cookie from 'js-cookie';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegistrationRequest from './RegistrationRequests';
import { server } from '@/test/msw/server';
import { toast } from '@/components/hooks/use-toast';

const API_ORIGIN = 'http://localhost:8080/api';
const approverId = 42;

vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({ default: () => null }));
vi.mock('@/components/hooks/use-toast', () => ({ toast: vi.fn() }));

const requests = [
  {
    id: 11,
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: null,
    dataIngresso: '2026-09-01',
    status: 'Pendente' as const,
    nivelUsuario: 'Mentorado' as const,
    cidade: 'Belo Jardim',
    curso: 'ES',
    instituicao: 'IFPE',
  },
  {
    id: 22,
    nomeCompleto: 'Bruno Souza',
    email: 'bruno@example.invalid',
    telefone: null,
    dataIngresso: '2026-09-02',
    status: 'Pendente' as const,
    nivelUsuario: 'Mentorado' as const,
    cidade: 'Belo Jardim',
    curso: 'ES',
    instituicao: 'IFPE',
  },
];

const mutationResponse: unknown[] = [];

function useApprovalList(list: typeof requests = requests) {
  server.use(
    http.get(`${API_ORIGIN}/Usuarios/${approverId}/dependentes/aprovacao`, () =>
      HttpResponse.json(list)
    )
  );
}

function renderPage() {
  Cookie.set('doorKey', 'session-token');
  Cookie.set('rankID', String(approverId));
  return render(<RegistrationRequest />);
}

describe('RegistrationRequests: fluxo crítico de aprovação e rejeição', () => {
  beforeEach(() => {
    useApprovalList();
  });

  it('aprova pelo ID correto, atualiza a lista e mantém o feedback de sucesso', async () => {
    let currentRequests = [...requests];
    const patchRequests: Array<{ url: string; body: unknown }> = [];

    server.use(
      http.get(
        `${API_ORIGIN}/Usuarios/${approverId}/dependentes/aprovacao`,
        () => HttpResponse.json(currentRequests)
      ),
      http.patch(
        `${API_ORIGIN}/Usuarios/dependentes/:dependenteId/aprovar`,
        async ({ request, params }) => {
          patchRequests.push({
            url: request.url,
            body: await request.json(),
          });
          currentRequests = currentRequests.filter(
            (requestItem) => requestItem.id !== Number(params.dependenteId)
          );
          return HttpResponse.json(mutationResponse);
        }
      )
    );

    renderPage();
    await screen.findByText('Ana Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar Ana Silva' }));

    await waitFor(() => expect(patchRequests).toHaveLength(1));
    expect(patchRequests[0]).toEqual({
      url: `${API_ORIGIN}/Usuarios/dependentes/11/aprovar`,
      body: { aprovadorId: approverId },
    });
    await waitFor(() =>
      expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Bruno Souza')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Solicitação aceita' })
    );
  });

  it('rejeita pelo ID correto e não envia uma segunda requisição', async () => {
    let currentRequests = [...requests];
    const patchRequests: string[] = [];

    server.use(
      http.get(
        `${API_ORIGIN}/Usuarios/${approverId}/dependentes/aprovacao`,
        () => HttpResponse.json(currentRequests)
      ),
      http.patch(
        `${API_ORIGIN}/Usuarios/dependentes/:dependenteId/rejeitar`,
        ({ request, params }) => {
          patchRequests.push(request.url);
          currentRequests = currentRequests.filter(
            (requestItem) => requestItem.id !== Number(params.dependenteId)
          );
          return HttpResponse.json({ message: 'Usuário rejeitado' });
        }
      )
    );

    renderPage();
    await screen.findByText('Ana Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Recusar Ana Silva' }));

    await waitFor(() => expect(patchRequests).toHaveLength(1));
    expect(patchRequests[0]).toBe(
      `${API_ORIGIN}/Usuarios/dependentes/11/rejeitar`
    );
    await waitFor(() =>
      expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument()
    );
  });

  it.each([
    ['permissão', 'aprovar', 403],
    ['solicitação já processada', 'rejeitar', 400],
  ] as const)('preserva a solicitação após erro de %s', async (_label, action, status) => {
    const endpoint = action === 'aprovar' ? 'aprovar' : 'rejeitar';

    server.use(
      http.patch(
        `${API_ORIGIN}/Usuarios/dependentes/:dependenteId/${endpoint}`,
        () => new HttpResponse(null, { status })
      )
    );

    renderPage();
    await screen.findByText('Ana Silva');

    fireEvent.click(
      screen.getByRole('button', {
        name: `${action === 'aprovar' ? 'Aprovar' : 'Recusar'} Ana Silva`,
      })
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: `${action === 'aprovar' ? 'Aprovar' : 'Recusar'} Ana Silva`,
        })
      ).toBeEnabled()
    );
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });

  it('permite tentar novamente após falha transitória sem remover a pendência', async () => {
    let attempts = 0;
    let currentRequests = [...requests];

    server.use(
      http.get(
        `${API_ORIGIN}/Usuarios/${approverId}/dependentes/aprovacao`,
        () => HttpResponse.json(currentRequests)
      ),
      http.patch(
        `${API_ORIGIN}/Usuarios/dependentes/:dependenteId/rejeitar`,
        ({ params }) => {
          attempts += 1;
          if (attempts === 1) return HttpResponse.error();

          currentRequests = currentRequests.filter(
            (requestItem) => requestItem.id !== Number(params.dependenteId)
          );
          return HttpResponse.json({ message: 'Usuário rejeitado' });
        }
      )
    );

    renderPage();
    await screen.findByText('Ana Silva');
    const rejectButton = screen.getByRole('button', { name: 'Recusar Ana Silva' });

    fireEvent.click(rejectButton);
    await waitFor(() => expect(rejectButton).toBeEnabled());
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();

    fireEvent.click(rejectButton);
    await waitFor(() =>
      expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument()
    );
    expect(attempts).toBe(2);
  });
});
