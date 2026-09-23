import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  rowId?: number | string;
};

function ItemReturn({ data, rowIndex, rowId }: ITableItem) {
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-surface' : 'bg-surface-muted';
  const [checked, setChecked] = useState(true);
  const itemName = data[0] || 'item';
  const identity = String(rowId ?? `${rowIndex}-${itemName}`);
  const switchId = `return-switch-${identity}`;
  const reasonId = `return-reason-${identity}`;

  const returnControl = (
    <div className='flex min-w-0 items-center gap-3'>
      <label htmlFor={switchId} className='sr-only'>
        Devolução {itemName}
      </label>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={setChecked}
        className='min-h-11 min-w-11 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
      />
    </div>
  );

  const reasonControl = (
    <div className='flex min-w-0 w-full items-center'>
      <label htmlFor={reasonId} className='sr-only'>
        Justificativa {itemName}
      </label>
      <input
        id={reasonId}
        disabled={checked}
        type='text'
        className='min-h-11 min-w-0 w-full rounded-md border border-borderMy bg-surface px-4 py-1 text-clt-2 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-canvas md:min-h-8'
      />
    </div>
  );

  if (columns.length !== data.length + 2)
    throw new Error(
      'Cada valor e controle de devolução devem corresponder às colunas responsivas.'
    );

  return (
      <ResponsiveRecord className={`${backgroundColor} hover:bg-surface-selected`}>
        {data.map((value, index) => (
          <ResponsiveCell
            key={columns[index].key}
            columnKey={columns[index].key}
          >
            {value || 'Não corresponde'}
          </ResponsiveCell>
        ))}
        <ResponsiveCell columnKey={columns[data.length].key}>
          {returnControl}
        </ResponsiveCell>
        <ResponsiveCell columnKey={columns[data.length + 1].key}>
          {reasonControl}
        </ResponsiveCell>
      </ResponsiveRecord>
  );
}

export default ItemReturn;
