import Cookie from 'js-cookie';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';

import RegisteredUsers from './RegisteredUsers';

vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';

const user = {
  id: 42,
  nomeCompleto: 'Gestora da Turma',
  email: 'gestora@example.test',
  telefone: '81999999999',
  dataIngresso: '2026-08-31',
  status: 'Habilitado' as const,
  nivelUsuario: 'Administrador' as const,
  tipoUsuario: 'Academico' as const,
  cidade: 'Belo Jardim',
  curso: 'Engenharia de Software',
  instituicao: 'IFPE',
  responsavel: null,
};

const users = [
  {
    ...user,
    id: 11,
    nomeCompleto: 'Ana Silva',
    nivelUsuario: 'Administrador' as const,
  },
  {
    ...user,
    id: 22,
    nomeCompleto: 'Bruno Souza',
    nivelUsuario: 'Mentor' as const,
  },
];

const renderPage = () => render(<MemoryRouter><RegisteredUsers /></MemoryRouter>);

function useSuccessfulHandlers() {
  server.use(
    http.get(`${API_ORIGIN}/Usuarios`, () => HttpResponse.json(users)),
    http.get(`${API_ORIGIN}/Usuarios/42/dependentes/aprovacao`, () =>
      HttpResponse.json([])
    ),
    http.get(`${API_ORIGIN}/Usuarios/42`, () => HttpResponse.json(user))
  );
}

describe('RegisteredUsers: estados de consulta', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
    Cookie.set('rankID', '42');
    Cookie.remove('level');
    useSuccessfulHandlers();
  });

  it('renderiza dados preenchidos recebidos pela consulta HTTP', async () => {
    renderPage();

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Souza')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renderiza vazio somente depois de uma resposta bem-sucedida vazia', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () => HttpResponse.json([])),
      http.get(`${API_ORIGIN}/Usuarios/42/dependentes/aprovacao`, () =>
        new HttpResponse(null, { status: 404 })
      )
    );

    renderPage();

    expect(
      await screen.findByText('Nenhum usuário cadastrado.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exibe falha persistente contextual sem transformá-la em coleção vazia', async () => {
    const secret = 'payload remoto secreto';
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () =>
        HttpResponse.json({ detail: secret, traceId: 'users-ref-500' }, { status: 500 })
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os usuários');
    expect(feedback).toHaveTextContent('O serviço não conseguiu concluir a operação.');
    expect(feedback).toHaveTextContent('Tentar novamente mais tarde.');
    expect(feedback).toHaveTextContent('Código de referência: users-ref-500');
    expect(feedback).toHaveTextContent('Tentar novamente');
    expect(feedback).not.toHaveTextContent(secret);
    expect(feedback).not.toHaveTextContent('Nenhum usuário cadastrado.');
  });

  it('liga o retry à consulta de usuários e recupera dados quando ela volta a funcionar', async () => {
    let usersRequests = 0;
    let signerRequests = 0;
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () => {
        usersRequests += 1;
        return usersRequests === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(users);
      }),
      http.get(`${API_ORIGIN}/Usuarios/42`, () => {
        signerRequests += 1;
        return HttpResponse.json(user);
      })
    );

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Tentar novamente' })
    );

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(usersRequests).toBe(2);
    expect(signerRequests).toBe(1);
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    );
  });

  it('mantém o mesmo feedback quando o retry falha novamente', async () => {
    let usersRequests = 0;
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () => {
        usersRequests += 1;
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Tentar novamente' })
    );

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os usuários');
    expect(usersRequests).toBe(2);
  });

  it('preserva sessão e tela em 403, sem mascarar autorização como vazio', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () =>
        HttpResponse.json({ detail: 'sem permissão secreta' }, { status: 403 })
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os usuários');
    expect(feedback).toHaveTextContent('Você não tem permissão para esta ação.');
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(Cookie.get('doorKey')).toBe('session-token');
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByText('Nenhum usuário cadastrado.')).not.toBeInTheDocument();
  });

  it('mantém 404 da lista como recurso ausente, pois o adaptador não o traduz para vazio', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios`, () =>
        new HttpResponse(null, { status: 404 })
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os usuários');
    expect(feedback).toHaveTextContent('O recurso solicitado não foi encontrado.');
    expect(screen.queryByText('Nenhum usuário cadastrado.')).not.toBeInTheDocument();
  });
});
