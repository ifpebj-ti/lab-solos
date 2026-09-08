import Cookie from 'js-cookie';
import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';

import ViewClass from './ViewClass';

vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const API_ORIGIN = 'http://localhost:8080/api';

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
  email: 'mentorado@example.test',
  nivelUsuario: 'Mentorado' as const,
  instituicao: 'Universidade',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/', state: { id: 7 } }]}>
      <ViewClass />
    </MemoryRouter>
  );

function useSuccessfulHandlers() {
  server.use(
    http.get(`${API_ORIGIN}/Usuarios/7/dependentes`, () =>
      HttpResponse.json([dependent])
    ),
    http.get(`${API_ORIGIN}/Usuarios/7`, () => HttpResponse.json(user))
  );
}

describe('ViewClass: estados de consulta', () => {
  beforeEach(() => {
    Cookie.set('doorKey', 'session-token');
    useSuccessfulHandlers();
  });

  it('renderiza dados preenchidos recebidos pela consulta HTTP', async () => {
    renderPage();

    expect(await screen.findByText('Mentorado da turma')).toBeInTheDocument();
    expect(screen.getByText('Gestora da Turma')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('respeita o 404 traduzido pelo adaptador como turma vazia', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/7/dependentes`, () =>
        new HttpResponse(null, { status: 404 })
      )
    );

    renderPage();

    expect(
      await screen.findByText('Nenhum usuário encontrado nesta turma.')
    ).toBeInTheDocument();
    expect(screen.getByText('Gestora da Turma')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exibe falha persistente contextual sem transformá-la em turma vazia', async () => {
    const secret = 'stack remota secreta';
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/7/dependentes`, () =>
        HttpResponse.json({ detail: secret, traceId: 'class-ref-500' }, { status: 500 })
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os dependentes da turma');
    expect(feedback).toHaveTextContent('O serviço não conseguiu concluir a operação.');
    expect(feedback).toHaveTextContent('Código de referência: class-ref-500');
    expect(feedback).toHaveTextContent('Tentar novamente');
    expect(feedback).not.toHaveTextContent(secret);
    expect(feedback).not.toHaveTextContent('Nenhum usuário encontrado nesta turma.');
  });

  it('liga o retry à consulta da turma e recupera vazio quando ela volta a funcionar', async () => {
    let classRequests = 0;
    let userRequests = 0;
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/7/dependentes`, () => {
        classRequests += 1;
        return classRequests === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json([]);
      }),
      http.get(`${API_ORIGIN}/Usuarios/7`, () => {
        userRequests += 1;
        return HttpResponse.json(user);
      })
    );

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Tentar novamente' })
    );

    expect(
      await screen.findByText('Nenhum usuário encontrado nesta turma.')
    ).toBeInTheDocument();
    expect(classRequests).toBe(2);
    expect(userRequests).toBe(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mantém o mesmo feedback quando o retry da turma falha novamente', async () => {
    let classRequests = 0;
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/7/dependentes`, () => {
        classRequests += 1;
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Tentar novamente' })
    );

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os dependentes da turma');
    expect(classRequests).toBe(2);
  });

  it('preserva sessão e tela em 403, sem mascarar autorização como turma vazia', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/7/dependentes`, () =>
        HttpResponse.json({ detail: 'autorização secreta' }, { status: 403 })
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar os dependentes da turma');
    expect(feedback).toHaveTextContent('Você não tem permissão para esta ação.');
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(Cookie.get('doorKey')).toBe('session-token');
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByText('Nenhum usuário encontrado nesta turma.')).not.toBeInTheDocument();
  });

  it('não converte 404 do usuário da turma em coleção vazia', async () => {
    server.use(
      http.get(`${API_ORIGIN}/Usuarios/7`, () =>
        new HttpResponse(null, { status: 404 })
      )
    );

    renderPage();

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Não foi possível carregar o usuário');
    expect(feedback).toHaveTextContent('O recurso solicitado não foi encontrado.');
    expect(screen.queryByText('Nenhum usuário encontrado nesta turma.')).not.toBeInTheDocument();
  });
});
