import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import LoanHistories from './LoanHistories';

const classApi = vi.hoisted(() => ({ getLoansByDependentes: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({
  default: ({ title, number }: { title: string; number: string }) => (
    <div aria-label={title}>{number}</div>
  ),
}));

const serverError = () =>
  createApplicationError({
    category: 'server',
    message: 'Falha sintetica',
    retryable: true,
  });

describe('LoanHistories: colecao e retorno', () => {
  beforeEach(() => vi.clearAllMocks());

  it('distingue falha de lista vazia e permite retry sem sair da sessao', async () => {
    classApi.getLoansByDependentes
      .mockRejectedValueOnce(serverError())
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/mentor/loan/histories']}>
        <LoanHistories />
      </MemoryRouter>
    );

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('carregar os empréstimos dos dependentes');
    expect(screen.queryByText('Nenhum dado disponível para exibição.')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/mentor/');

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(classApi.getLoansByDependentes).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Nenhum dado disponível para exibição.')).toBeInTheDocument();
  });
});
