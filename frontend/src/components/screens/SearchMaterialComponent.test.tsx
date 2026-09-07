import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import SearchMaterialComponent from './SearchMaterialComponent';
import { getAllProducts } from '@/integration/Product';
import { getSystemQuantities } from '@/integration/System';
import { AxiosHeaders } from 'axios';

vi.mock('@/integration/Product', () => ({ getAllProducts: vi.fn() }));
vi.mock('@/integration/System', () => ({ getSystemQuantities: vi.fn() }));
vi.mock('../global/OpenSearch', () => ({ default: () => null }));
vi.mock('../global/inputs/SelectInput', () => ({
  default: ({ onValueChange }: { onValueChange: (value: string) => void }) => (
    <select
      aria-label='Tipo'
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value='todos'>Todos</option>
      <option value='Vidraria'>Vidrarias</option>
    </select>
  ),
}));

const products = Array.from({ length: 8 }, (_, index) => ({
  id: index + 101,
  nomeProduto: `Produto ${index + 1}`,
  tipoProduto: index === 0 ? 'Vidraria' : 'Quimico',
  quantidade: 3,
  unidadeMedida: 'ml',
  status: 'Disponivel',
}));
function Location() {
  const location = useLocation();
  return (
    <output data-testid='location'>
      {JSON.stringify({ path: location.pathname, state: location.state })}
    </output>
  );
}
const mount = (userType: 'admin' | 'mentor' | 'mentee' = 'admin') =>
  render(
    <MemoryRouter>
      <SearchMaterialComponent
        userType={userType}
        destinationRoute={`/${userType}/verification`}
      />
      <Location />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAllProducts).mockResolvedValue(products);
  vi.mocked(getSystemQuantities).mockResolvedValue({
    data: { produtos: {} },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
});

describe('produtos: contratos existentes', () => {
  it.each(['admin', 'mentor', 'mentee'] as const)(
    'preserva sete registros, filtros, ordem e destino no perfil %s',
    async (profile) => {
      mount(profile);
      await screen.findByText('Produto 1');
      expect(screen.queryByText('Produto 8')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^(Página )?2$/ }));
      expect(screen.getByText('Produto 8')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^(Página )?1$/ }));
      const search = screen.getByRole('textbox');
      fireEvent.change(search, { target: { value: 'Produto 2' } });
      expect(screen.queryByText('Produto 1')).not.toBeInTheDocument();
      fireEvent.change(search, { target: { value: '' } });
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'Vidraria' },
      });
      expect(screen.getByText('Produto 1')).toBeInTheDocument();
      expect(screen.queryByText('Produto 2')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Produto 1'));
      expect(screen.getByTestId('location')).toHaveTextContent(
        JSON.stringify({ path: `/${profile}/verification`, state: { id: 101 } })
      );
      expect(getAllProducts).toHaveBeenCalledTimes(1);
    }
  );
});

describe('produtos responsivos', () => {
  it('associa os seis valores a rótulos e oferece link nativo', async () => {
    mount();
    await screen.findByText('Produto 1');
    const list = screen.getByRole('list', { name: 'Produtos' });
    const first = within(list).getAllByRole('listitem')[0];
    expect(
      Array.from(first.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['ID', 'Nome', 'Tipo', 'Quantidade', 'Unidade', 'Status']);
    expect(
      Array.from(first.querySelectorAll('dd')).map((node) => node.textContent)
    ).toEqual(['101', 'Produto 1', 'Vidraria', '3', 'ml', 'Disponivel']);
    expect(within(first).getByRole('link', { name: '101' })).toHaveAttribute(
      'href',
      '/admin/verification'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inverter ordem' }));
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent(
      'Produto 8'
    );
  });
  it('mantém carregamento e vazio após falha de consulta', async () => {
    vi.mocked(getAllProducts).mockRejectedValue(new Error('Falha sintética'));
    mount();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhum dado disponível para exibição.')
    ).toBeInTheDocument();
  });
});
