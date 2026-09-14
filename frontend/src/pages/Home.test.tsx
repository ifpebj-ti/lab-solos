import { render, screen } from '@testing-library/react';
import Cookie from 'js-cookie';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Home from './Home';

const profiles = [
  {
    name: 'Mentor',
    token: 'e30.eyJyb2xlIjoiTWVudG9yIn0.',
  },
  {
    name: 'Mentorado',
    token: 'e30.eyJyb2xlIjoiTWVudG9yYWRvIn0.',
  },
] as const;

describe.each(profiles)('Home de $name', ({ token }) => {
  afterEach(() => {
    Cookie.remove('doorKey');
  });

  it('mantém boas-vindas e busca sem cards promocionais', () => {
    Cookie.set('doorKey', token);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(
      screen.getByText(/Bem-vindo\(a\) ao Laborat/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.queryByText(/Solicita/)).not.toBeInTheDocument();
  });
});
