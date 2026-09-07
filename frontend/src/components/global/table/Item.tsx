import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
};

function ItemTable({ data, rowIndex }: ITableItem) {
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  if (columns.length !== data.length)
    throw new Error('Cada valor deve corresponder a uma coluna responsiva.');

  return (
    <ResponsiveRecord className={`${backgroundColor} hover:bg-cl-table`}>
      {data.map((value, index) => (
        <ResponsiveCell key={columns[index].key} columnKey={columns[index].key}>
          {value || 'Não corresponde'}
        </ResponsiveCell>
      ))}
    </ResponsiveRecord>
  );
}

export default ItemTable;
