import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import HistoryClass from './HistoryClass';

const classApi = vi.hoisted(() => ({ getLoansByDependentes: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

const serverError = () =>
  createApplicationError({
    category: 'server',
    message: 'Falha sintetica',
    retryable: true,
  });

describe('HistoryClass: colecao e retorno', () => {
  beforeEach(() => vi.clearAllMocks());

  it('distingue falha de lista vazia e permite retry sem perder o retorno do mentor', async () => {
    classApi.getLoansByDependentes
      .mockRejectedValueOnce(serverError())
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/mentor/history/class']}>
        <HistoryClass />
      </MemoryRouter>
    );

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('carregar os empréstimos dos dependentes');
    expect(screen.queryByText('Nenhum empréstimo encontrado.')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/mentor/');

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(classApi.getLoansByDependentes).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Nenhum empréstimo encontrado.')).toBeInTheDocument();
  });
});
