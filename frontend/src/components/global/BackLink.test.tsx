import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import BackLink from './BackLink';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}</output>;
}

describe('BackLink', () => {
  it('renders an accessible link to the explicit parent route', () => {
    render(
      <MemoryRouter initialEntries={['/admin/return']}>
        <BackLink pathname='/admin/return' role='Administrador' />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Voltar' });
    expect(link).toHaveAttribute('href', '/admin/all-loans');
    link.focus();
    expect(link).toHaveFocus();
  });

  it('navigates by keyboard-compatible link activation without using history', () => {
    render(
      <MemoryRouter initialEntries={['/mentor/history/loan']}>
        <BackLink pathname='/mentor/history/loan' role='Mentor'>
          Retornar ao histórico
        </BackLink>
        <LocationProbe />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Retornar ao histórico' });
    expect(link).toHaveAttribute('href', '/mentor/history/class');
    fireEvent.click(link);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/mentor/history/class'
    );
  });

  it('uses the router location when pathname is not supplied', () => {
    render(
      <MemoryRouter initialEntries={['/mentee/verification']}>
        <BackLink role='Mentorado' />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentee/search-material'
    );
  });
});
