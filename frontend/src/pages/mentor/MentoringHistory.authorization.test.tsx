import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MentoringHistory from './MentoringHistory';

const mentoringApi = vi.hoisted(() => ({
  getUserById: vi.fn(),
  getUserForMentoring: vi.fn(),
  getLoansByUserId: vi.fn(),
}));

vi.mock('@/integration/Users', () => ({
  getUserById: mentoringApi.getUserById,
  getUserForMentoring: mentoringApi.getUserForMentoring,
}));

vi.mock('@/integration/Loans', () => ({
  getLoansByUserId: mentoringApi.getLoansByUserId,
}));

const mentoringProfile = {
  id: 12,
  nomeCompleto: 'Ada Lovelace',
  email: 'ada@example.com',
  telefone: null,
  dataIngresso: '2024-02-29',
  instituicao: null,
  cidade: 'Belo Jardim',
  curso: 'ES',
  status: 'Habilitado',
  nivelUsuario: 'Mentorado',
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  mentoringApi.getUserById.mockResolvedValue(mentoringProfile);
  mentoringApi.getUserForMentoring.mockResolvedValue(mentoringProfile);
  mentoringApi.getLoansByUserId.mockResolvedValue([]);
});

describe('histórico de mentorados autorizado', () => {
  it('exibe os dados mínimos da projeção sem depender do perfil completo', async () => {
    render(
      <MemoryRouter initialEntries={['/mentor/history/mentoring?id=12']}>
        <MentoringHistory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Belo Jardim')).toBeInTheDocument();
    expect(mentoringApi.getUserForMentoring).toHaveBeenCalledWith({ id: 12 });
    expect(mentoringApi.getUserById).not.toHaveBeenCalled();
  });

  it('exibe 404 como falha e mantém o retorno à turma do mentor', async () => {
    mentoringApi.getUserForMentoring.mockRejectedValue({
      name: 'ApplicationError',
      category: 'not_found',
      message: 'not found',
      status: 404,
      retryable: false,
    });
    render(
      <MemoryRouter initialEntries={['/mentor/history/mentoring?id=12']}>
        <MentoringHistory />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('O recurso solicitado não foi encontrado.')).toBeInTheDocument();
    expect(mentoringApi.getUserForMentoring).toHaveBeenCalledWith({ id: 12 });
    expect(mentoringApi.getUserById).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentor/my-class'
    );
    expect(mentoringApi.getLoansByUserId).not.toHaveBeenCalled();
  });
});
