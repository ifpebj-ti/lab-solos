import { ReactNode } from 'react';
import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  onClick1: () => void;
  onClick2?: () => void;
  icon1: ReactNode;
  icon2?: ReactNode | undefined;
  itemLabel?: string;
  actionLabels?: readonly [string, string?];
};

function ItemTableButton({
  data,
  rowIndex,
  onClick1,
  onClick2,
  icon1,
  icon2 = undefined,
  itemLabel,
  actionLabels,
}: ITableItem) {
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  const actions = (
    <div className='flex min-w-0 flex-wrap items-center gap-3'>
      <button
        type='button'
        aria-label={
          itemLabel && actionLabels ? `${actionLabels[0]} ${itemLabel}` : undefined
        }
        onClick={onClick1}
        className='flex min-h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
      >
        <span aria-hidden='true'>{icon1}</span>
      </button>
      {icon2 !== undefined && (
        <button
          type='button'
          aria-label={
            itemLabel && actionLabels?.[1]
              ? `${actionLabels[1]} ${itemLabel}`
              : undefined
          }
          onClick={onClick2}
          className='flex min-h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
        >
          <span aria-hidden='true'>{icon2}</span>
        </button>
      )}
    </div>
  );

  if (columns.length !== data.length + 1)
    throw new Error(
      'Cada valor e a celula de acoes devem corresponder as colunas responsivas.'
    );
  if (!itemLabel || !actionLabels || (icon2 !== undefined && !actionLabels[1]))
    throw new Error('Acoes responsivas exigem nomes e identificacao do registro.');
  return (
      <ResponsiveRecord
        className={`${backgroundColor} hover:bg-cl-table`}
      >
        {data.map((value, index) => (
          <ResponsiveCell
            key={columns[index].key}
            columnKey={columns[index].key}
          >
            {value}
          </ResponsiveCell>
        ))}
        <ResponsiveCell columnKey={columns[data.length].key}>
          {actions}
        </ResponsiveCell>
      </ResponsiveRecord>
  );
}

export default ItemTableButton;
