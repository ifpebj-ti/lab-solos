import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna da linha
};

function ItemOnly({ data }: ITableItem) {
  const columns = requireResponsiveColumns(useResponsiveColumns());

  if (columns.length !== data.length)
    throw new Error('Cada valor deve corresponder a uma coluna responsiva.');

  return (
    <ResponsiveRecord className='bg-backgroundMy hover:bg-cl-table'>
      {data.map((value, index) => (
        <ResponsiveCell key={columns[index].key} columnKey={columns[index].key}>
          {value || 'Não informado'}
        </ResponsiveCell>
      ))}
    </ResponsiveRecord>
  );
}

export default ItemOnly;
