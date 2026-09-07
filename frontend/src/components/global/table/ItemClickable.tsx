import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

interface ITableItem {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  destinationRoute: string; // Rota de destino
  id: number | string; // ID do item para navegação
}

function ClickableItemTable({
  data,
  rowIndex,
  destinationRoute,
  id,
}: ITableItem) {
  const navigate = useNavigate();
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  const handleClick = () => {
    navigate(destinationRoute, { state: { id } });
  };
  if (columns.length !== data.length)
    throw new Error('Cada valor deve corresponder a uma coluna responsiva.');
  return (
      <ResponsiveRecord
        className={`${backgroundColor} hover:bg-cl-table cursor-pointer`}
        onClick={(event) => {
          if (
            (event.target as HTMLElement).closest(
              'a, button, input, select, textarea, [role="switch"], [role="checkbox"], [role="combobox"]'
            )
          )
            return;
          handleClick();
        }}
      >
        {data.map((value, index) => (
          <ResponsiveCell
            key={columns[index].key}
            columnKey={columns[index].key}
          >
            {index === 0 ? (
              <Link
                to={destinationRoute}
                state={{ id }}
                className='inline-flex min-h-11 min-w-11 max-w-full items-center underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-0 [@media(pointer:coarse)]:min-h-11'
              >
                {value}
              </Link>
            ) : (
              value
            )}
          </ResponsiveCell>
        ))}
      </ResponsiveRecord>
  );
}

export default ClickableItemTable;
