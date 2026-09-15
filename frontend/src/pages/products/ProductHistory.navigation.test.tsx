import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductHistoryPage from './ProductHistory';

const productApi = vi.hoisted(() => ({
  getProductHistoricoSaida: vi.fn(),
}));

vi.mock('@/integration/Product', () => productApi);

describe('ProductHistory: contrato do identificador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['0', '-1', '1.5', '1e2', '2147483648', 'texto'])(
    'não consulta id inválido %s', async (id) => {
      render(
        <MemoryRouter initialEntries={[`/admin/products/${id}/history`]}>
          <Routes>
            <Route path='/admin/products/:id/history' element={<ProductHistoryPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível carregar o histórico do produto'
      );
      expect(productApi.getProductHistoricoSaida).not.toHaveBeenCalled();
    }
  );
});
