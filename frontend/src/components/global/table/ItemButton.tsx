import { ReactNode } from 'react';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  columnWidths: string[]; // Array com as larguras de cada coluna
  onClick1: () => void;
  onClick2?: () => void;
  icon1: ReactNode;
  icon2?: ReactNode | undefined;
};

function ItemTableButton({
  data,
  rowIndex,
  columnWidths,
  onClick1,
  onClick2,
  icon1,
  icon2 = undefined,
}: ITableItem) {
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  return (
    <div
      className={`w-full h-9 flex items-center ${backgroundColor} mb-1 px-3 rounded-sm hover:scale-customScale ${isOdd ? 'hover:bg-cl-table' : 'hover:bg-opacity-60'}`}
    >
      {data.map((value, index) => (
        <p
          key={index}
          style={{ width: columnWidths[index] }}
          className='text-start font-inter-regular text-sm text-clt-2 text-ellipsis text-nowrap overflow-hidden whitespace-nowrap'
        >
          {value}
        </p>
      ))}
      <div className='flex gap-x-3'>
        <button
          onClick={onClick1}
          className='w-7 h-7 rounded-sm flex items-center justify-center'
        >
          {icon1}
        </button>
        {icon2 !== undefined && (
          <button
            onClick={onClick2}
            className='w-7 h-7 rounded-sm flex items-center justify-center'
          >
            {icon2}
          </button>
        )}
      </div>
    </div>
  );
}

export default ItemTableButton;
