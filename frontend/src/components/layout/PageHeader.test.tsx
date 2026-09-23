import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('expõe título, contexto e ação sem conhecer dados ou navegação', () => {
    render(
      <PageHeader
        title='Catálogo de materiais'
        context='42 registros disponíveis'
        action={<button type='button'>Cadastrar material</button>}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Catálogo de materiais', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('42 registros disponíveis')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cadastrar material' })
    ).toBeInTheDocument();
  });
});
