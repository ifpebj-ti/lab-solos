import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Home from './Home';

const mocks = vi.hoisted(() => ({
  getDependentesForApproval: vi.fn(),
  getAllLoans: vi.fn(),
  getAlertProducts: vi.fn(),
}));

vi.mock('@/integration/Class', () => ({
  getDependentesForApproval: mocks.getDependentesForApproval,
}));

vi.mock('@/integration/Loans', () => ({
  getAllLoans: mocks.getAllLoans,
}));

vi.mock('@/integration/Product', () => ({
  getAlertProducts: mocks.getAlertProducts,
}));

describe('Home administrativa', () => {
  beforeEach(() => {
    mocks.getDependentesForApproval.mockResolvedValue([]);
    mocks.getAllLoans.mockResolvedValue([]);
    mocks.getAlertProducts.mockResolvedValue([]);
  });

  it('mantém destinos operacionais para produtos, usuários e empréstimos', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^Produtos$/ })).toHaveAttribute(
        'href',
        '/admin/search-material'
      );
      expect(screen.getByRole('link', { name: /^Usuários$/ })).toHaveAttribute(
        'href',
        '/admin/users'
      );
      expect(
        screen.getByRole('link', { name: /^Empréstimos$/ })
      ).toHaveAttribute(
        'href',
        '/admin/all-loans'
      );
    });
  });
});
