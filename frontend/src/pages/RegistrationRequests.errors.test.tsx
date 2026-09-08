import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import RegistrationRequest from './RegistrationRequests';

const classApi = vi.hoisted(() => ({
  getDependentesForApproval: vi.fn(),
  approveDependente: vi.fn(),
  rejectDependente: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));
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

const applicationError = (
  category: 'authorization' | 'conflict' | 'server' | 'validation'
) =>
  createApplicationError({
    category,
    message: 'SENTINELA_REMOTA_TOKEN_SENHA_STACK',
    retryable: category === 'server',
  });

describe('RegistrationRequests: feedback e estados de mutacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentesForApproval.mockResolvedValue(requests);
    classApi.approveDependente.mockResolvedValue(undefined);
    classApi.rejectDependente.mockResolvedValue(undefined);
  });

  it('caracteriza sucesso e atualiza a lista somente depois da aprovacao', async () => {
    classApi.getDependentesForApproval
      .mockReset()
      .mockResolvedValueOnce(requests)
      .mockResolvedValueOnce([requests[1]]);

    let resolveApproval!: () => void;
    classApi.approveDependente.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveApproval = resolve;
        })
    );

    render(<RegistrationRequest />);
    await screen.findByText('Ana Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar Ana Silva' }));

    await waitFor(() => {
      expect(classApi.approveDependente).toHaveBeenCalledWith(11);
    });
    expect(classApi.getDependentesForApproval).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aprovar Ana Silva' })
    ).toBeDisabled();

    resolveApproval();

    await waitFor(() => {
      expect(classApi.getDependentesForApproval).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('aceita'),
      })
    );
  });

  it('preserva o registro apos falha ao aprovar e apresenta o conflito contextualizado', async () => {
    classApi.approveDependente.mockRejectedValueOnce(
      applicationError('conflict')
    );

    render(<RegistrationRequest />);
    await screen.findByText('Ana Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar Ana Silva' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('aprovar o cadastro'),
          description: expect.stringContaining(
            'Atualizar os dados antes de tentar novamente.'
          ),
          variant: 'destructive',
        })
      );
    });
    expect(classApi.getDependentesForApproval).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aprovar Ana Silva' })
    ).toBeEnabled();
  });

  it('preserva o registro apos falha ao rejeitar e mantem a sessao em 403', async () => {
    classApi.rejectDependente.mockRejectedValueOnce(
      applicationError('authorization')
    );

    render(<RegistrationRequest />);
    await screen.findByText('Ana Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Recusar Ana Silva' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('rejeitar o cadastro'),
          description: expect.stringContaining(
            'tem permiss'
          ),
          variant: 'destructive',
        })
      );
    });
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Recusar Ana Silva' })
    ).toBeEnabled();
  });

  it('desabilita somente a acao enviada e a reabilita ao terminar', async () => {
    let resolveRejection!: () => void;
    classApi.rejectDependente.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRejection = resolve;
        })
    );

    render(<RegistrationRequest />);
    await screen.findByText('Ana Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Recusar Ana Silva' }));

    expect(
      screen.getByRole('button', { name: 'Recusar Ana Silva' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Aprovar Ana Silva' })
    ).toBeEnabled();

    resolveRejection();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Recusar Ana Silva' })
      ).toBeEnabled();
    });
  });

  it('anuncia validacao global em falha de aprovacao', async () => {
    classApi.approveDependente.mockRejectedValueOnce(
      applicationError('validation')
    );

    render(<RegistrationRequest />);
    await screen.findByText('Ana Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar Ana Silva' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining(
            'informados precisam'
          ),
          variant: 'destructive',
        })
      );
    });
  });

  it('distingue falha de carga de lista vazia e recupera no retry', async () => {
    classApi.getDependentesForApproval
      .mockReset()
      .mockRejectedValueOnce(applicationError('server'))
      .mockResolvedValueOnce(requests);

    render(<RegistrationRequest />);

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('carregar os cadastros para');
    expect(feedback).toHaveTextContent('Tentar novamente mais tarde.');
    expect(screen.queryByText(/Nenhuma solicita.*pendente/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
