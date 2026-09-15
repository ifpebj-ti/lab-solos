import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import Settings from './Settings';

describe('Settings', () => {
  it('mantém alteração de senha e remove a instrução de protótipo', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Configura/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alterar senha' })).toBeInTheDocument();
    expect(
      screen.queryByText(/Adicione aqui as op/)
    ).not.toBeInTheDocument();
  });
});
