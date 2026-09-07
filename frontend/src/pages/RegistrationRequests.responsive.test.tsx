import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegistrationRequest from './RegistrationRequests';

const classApi = vi.hoisted(() => ({
  getDependentesForApproval: vi.fn(),
  approveDependente: vi.fn(),
  rejectDependente: vi.fn(),
}));

vi.mock('@/integration/Class', () => classApi);
vi.mock('js-cookie', () => ({ default: { get: () => '4242' } }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({ default: () => null }));

const requests = [
  {
    id: 11,
    nomeCompleto: 'Ana Silva',
    email: 'ana@example.invalid',
    telefone: null,
    dataIngresso: '2026-09-01',
    status: 'Pendente',
    nivelUsuario: 'Mentorado',
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
    status: 'Pendente',
    nivelUsuario: 'Mentorado',
    cidade: 'Belo Jardim',
    curso: 'ES',
    instituicao: 'IFPE',
  },
];

describe('solicitacoes de cadastro: contratos existentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentesForApproval.mockResolvedValue(requests);
    classApi.approveDependente.mockResolvedValue(undefined);
    classApi.rejectDependente.mockResolvedValue(undefined);
  });

  it('envia o registro correto uma vez para recusa e aprovacao', async () => {
    render(<RegistrationRequest />);

    await screen.findByText('Ana Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Recusar Ana Silva' }));
    await waitFor(() => expect(classApi.rejectDependente).toHaveBeenCalledWith(11));
    expect(classApi.rejectDependente).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: 'Aprovar Bruno Souza' })
    );
    await waitFor(() => expect(classApi.approveDependente).toHaveBeenCalledWith(22));
    expect(classApi.approveDependente).toHaveBeenCalledTimes(1);
  });

  it('renderiza dados, rotulos e nomes das acoes no mesmo registro', async () => {
    render(<RegistrationRequest />);

    const list = await screen.findByRole('list', {
      name: 'Solicitações de cadastro',
    });
    const records = Array.from(list.querySelectorAll('[role="listitem"]'));
    expect(records).toHaveLength(2);
    expect(
      Array.from(records[0].querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual([
      'Data de solicitação',
      'Nome',
      'Email',
      'Instituição',
      'Ações',
    ]);
    expect(records[0]).toHaveTextContent('Ana Silva');
    expect(records[0]).toHaveTextContent('ana@example.invalid');
    expect(
      screen.getByRole('button', { name: 'Recusar Ana Silva' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aprovar Ana Silva' })
    ).toBeInTheDocument();
  });

  it('mantem carregamento acessivel e vazio apos falha da consulta', async () => {
    let rejectRequest!: (reason: Error) => void;
    classApi.getDependentesForApproval.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject;
        })
    );

    render(<RegistrationRequest />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
    rejectRequest(new Error('Falha sintetica'));

    expect(
      await screen.findByText('Nenhuma solicitação de cadastro pendente.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
