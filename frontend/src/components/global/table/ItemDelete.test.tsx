import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ItemDelete from './ItemDelete';
import { ResponsiveTable } from './ResponsiveTable';

const columns = [
  { key: 'codigo', label: 'Código', weight: 2 },
  { key: 'nome', label: 'Nome do Produto', weight: 4 },
  { key: 'quantidade', label: 'Quantidade', weight: 3 },
  { key: 'acao', label: 'Ação', weight: 1 },
] as const;

describe('ItemDelete', () => {
  it('mantém o callback de remoção do registro', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ResponsiveTable label='Produtos selecionados' columns={columns}>
        <ItemDelete
          data={['11', 'Ácido cítrico', '2 Litros']}
          rowIndex={0}
          icon1={<span>ícone</span>}
          onClick={onClick}
          itemLabel='Ácido cítrico'
          actionLabel='Remover'
        />
      </ResponsiveTable>
    );

    fireEvent.click(container.querySelector('button')!);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('rotula dados e remoção sem submeter o formulário', () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <ResponsiveTable label='Produtos selecionados' columns={columns}>
          <ItemDelete
            data={['11', 'Ácido cítrico', '2 Litros']}
            rowIndex={0}
            icon1={<span>ícone</span>}
            onClick={onClick}
            itemLabel='Ácido cítrico'
            actionLabel='Remover'
          />
        </ResponsiveTable>
      </form>
    );

    const record = screen.getByRole('listitem');
    expect(
      Array.from(record.querySelectorAll('dt')).map((node) => node.textContent)
    ).toEqual(['Código', 'Nome do Produto', 'Quantidade', 'Ação']);

    const remove = screen.getByRole('button', {
      name: 'Remover Ácido cítrico',
    });
    expect(remove).toHaveAttribute('type', 'button');
    fireEvent.click(remove);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
