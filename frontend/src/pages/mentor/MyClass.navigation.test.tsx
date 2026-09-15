import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MyClass from './MyClass';

const classApi = vi.hoisted(() => ({ getDependentes: vi.fn() }));

vi.mock('@/integration/Class', () => classApi);
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));

describe('MyClass: retorno da jornada do mentor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classApi.getDependentes.mockResolvedValue([]);
  });

  it('retorna para a home do mentor sem depender do historico', async () => {
    render(
      <MemoryRouter initialEntries={['/mentor/my-class']}>
        <MyClass />
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/mentor/'
    );
  });
});
