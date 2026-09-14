import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Disabled from './Disabled';

const classApi = vi.hoisted(() => ({ getDependentes: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

describe('Disabled: retorno para minha turma', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentes.mockResolvedValue([]);
  });

  it('retorna para /mentor/my-class', async () => {
    render(
      <MemoryRouter initialEntries={['/mentor/my-class/disabled']}>
        <Disabled />
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentor/my-class'
    );
  });
});
