type Column = {
  value: string;
  width: string;
};

type HeaderTableProps = {
  columns: Column[];
};

function HeaderTable({ columns }: HeaderTableProps) {
  return (
    <div className='flex items-center border-b border-borderMy w-full text-sm font-inter-regular text-clt-2 mb-1 pb-2 px-3 mt-4'>
      {columns.map((column, index) => (
        <p key={index} style={{ width: column.width }} className='text-start'>
          {column.value}
        </p>
      ))}
    </div>
  );
}

export default HeaderTable;
