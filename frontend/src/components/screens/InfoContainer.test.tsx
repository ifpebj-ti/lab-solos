import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import InfoContainer from './InfoContainer';

const items = [
  { title: 'Nome', value: 'Ada Lovelace', width: '25%' },
  { title: 'Email', value: 'ada@example.com', width: '25%' },
  { title: 'Instituição', value: 'IFPE', width: '25%' },
  { title: 'Status', value: 'Habilitado', width: '25%' },
];

describe('InfoContainer', () => {
  it('permite alinhar grupos de perfil em duas colunas sem limitar sua largura', () => {
    render(<InfoContainer items={items} columns={2} className='lg:w-full' />);

    const panel = screen.getByText('Nome').parentElement?.parentElement;

    expect(panel).toHaveClass('sm:grid-cols-2', 'lg:w-full');
    expect(panel).not.toHaveClass('lg:grid-cols-4', 'lg:w-[49%]');
  });

  it('mantém a distribuição automática dos grupos existentes', () => {
    render(<InfoContainer items={items} />);

    const panel = screen.getByText('Nome').parentElement?.parentElement;

    expect(panel).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-4');
  });
});
