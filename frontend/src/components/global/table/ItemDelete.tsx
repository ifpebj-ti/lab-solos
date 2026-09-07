import { ReactNode } from 'react';
import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  onClick: () => void;
  icon1: ReactNode;
  itemLabel?: string;
  actionLabel?: string;
};

function ItemDelete({
  data,
  rowIndex,
  onClick,
  icon1,
  itemLabel,
  actionLabel,
}: ITableItem) {
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  const action = (
    <button
      type='button'
      aria-label={
        itemLabel && actionLabel ? `${actionLabel} ${itemLabel}` : undefined
      }
      onClick={onClick}
      className='flex min-h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
    >
      <span aria-hidden='true'>{icon1}</span>
    </button>
  );

  if (columns.length !== data.length + 1)
    throw new Error(
      'Cada valor e a célula de ação devem corresponder às colunas responsivas.'
    );
  if (!itemLabel || !actionLabel)
    throw new Error('A ação responsiva exige nome e identificação do registro.');
  return (
      <ResponsiveRecord className={`${backgroundColor} hover:bg-cl-table`}>
        {data.map((value, index) => (
          <ResponsiveCell
            key={columns[index].key}
            columnKey={columns[index].key}
          >
            {value}
          </ResponsiveCell>
        ))}
        <ResponsiveCell columnKey={columns[data.length].key}>
          {action}
        </ResponsiveCell>
      </ResponsiveRecord>
  );
}

export default ItemDelete;
