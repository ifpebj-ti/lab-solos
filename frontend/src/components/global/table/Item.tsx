type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  columnWidths: string[]; // Array com as larguras de cada coluna
};

function ItemTable({ data, rowIndex, columnWidths }: ITableItem) {
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
    </div>
  );
}

export default ItemTable;
