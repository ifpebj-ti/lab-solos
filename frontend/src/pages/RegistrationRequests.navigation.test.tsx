import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useLocation, MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
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

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}</output>;
}

const serverError = () =>
  createApplicationError({
    category: 'server',
    message: 'Falha sintetica',
    retryable: true,
  });

describe('RegistrationRequests: retorno por perfil', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['/admin/register-request', '/admin/users'],
    ['/mentor/users-request', '/mentor/my-class'],
  ])('retorna de %s para %s sem history.back', async (entry, expectedPath) => {
    classApi.getDependentesForApproval.mockRejectedValueOnce(serverError());

    render(
      <MemoryRouter initialEntries={[entry]}>
        <RegistrationRequest />
        <LocationProbe />
      </MemoryRouter>
    );

    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(expectedPath)
    );
  });
});
