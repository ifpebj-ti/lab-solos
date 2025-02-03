type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  columnWidths: string[]; // Array com as larguras de cada coluna
};

function ItemOnly({ data, columnWidths }: ITableItem) {
  return (
    <div
      className={`w-full h-9 flex items-center bg-cl-table-item mb-1 px-3 rounded-sm hover:scale-customScale hover:bg-opacity-60`}
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

export default ItemOnly;
