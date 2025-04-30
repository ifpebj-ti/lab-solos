import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  columnWidths: string[]; // Array com as larguras de cada coluna
};

function ItemReturn({ data, rowIndex, columnWidths }: ITableItem) {
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';
  const [checked, setChecked] = useState(true);

  return (
    <div
      className={`w-full h-9 flex items-center ${backgroundColor} mb-1 px-3 rounded-sm hover:scale-customScale ${isOdd ? 'hover:bg-cl-table' : 'hover:bg-opacity-60'}`}
    >
      {data.map((value, index) => (
        <p
          key={index}
          style={{ width: columnWidths[index], minWidth: columnWidths[index] }}
          className='text-start font-inter-regular text-sm text-clt-2 text-ellipsis text-nowrap overflow-hidden whitespace-nowrap'
        >
          {value}
        </p>
      ))}
      <div className='flex gap-x-3 w-[15%]'>
        <Switch
          id='default-switch'
          checked={checked}
          onCheckedChange={() => setChecked(!checked)}
        />
      </div>
      <div className='flex gap-x-3 w-[45%] h-full items-center justify-end'>
        <input
          disabled={checked}
          type='text'
          className={`bg-backgroundMy w-full h-4/5 px-4 py-1 rounded-sm border ${isOdd ? 'bg-backgroundMy' : 'bg-backgroundMy'} border-borderMy focus:outline-none`}
        ></input>
      </div>
    </div>
  );
}

export default ItemReturn;
