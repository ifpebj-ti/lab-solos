import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import InfoCard from './InfoCard';

describe('InfoCard', () => {
  it('é um link acessível com destino e notificação operacional', () => {
    render(
      <MemoryRouter>
        <InfoCard
          icon={<span aria-hidden='true'>Ícone</span>}
          text='Solicitações de empréstimo'
          notify
          link='/admin/loans-request'
          quant={3}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', {
      name: /Solicitações de empréstimo/i,
    });
    expect(link).toHaveAttribute('href', '/admin/loans-request');
    expect(link).toHaveProperty('tabIndex', 0);
    expect(link).toHaveTextContent('3');
    expect(
      screen.getByRole('status', { name: '3 notificações pendentes' })
    ).toBeInTheDocument();
  });
});
