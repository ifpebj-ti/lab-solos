import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

interface ITableItemWithActions {
  data: ReactNode[];
  rowIndex: number;
  destinationRoute: string;
  id: number | string;
  onRowClick?: () => void;
  itemLabel?: string;
}

const interactiveSelector =
  'a, button, input, select, textarea, [role="switch"], [role="checkbox"], [role="combobox"], [role="option"], [role="listbox"], [role="menuitem"]';

function TableItemWithActions({
  data,
  rowIndex,
  destinationRoute,
  id,
  onRowClick,
  itemLabel,
}: ITableItemWithActions) {
  const navigate = useNavigate();
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  const openRecord = () => {
    if (onRowClick) onRowClick();
    else navigate(destinationRoute, { state: { id } });
  };

  const handleRecordClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) return;
    openRecord();
  };

  if (columns.length !== data.length)
    throw new Error('Cada valor deve corresponder a uma coluna responsiva.');
  if (!itemLabel)
    throw new Error('A linha responsiva exige identificação do registro.');

  return (
      <ResponsiveRecord
        className={`${backgroundColor} cursor-pointer hover:bg-cl-table [&_button]:min-h-11 [&_input]:min-h-11 [&_a]:min-h-11 [&_[role=combobox]]:min-h-11 [&_[role=combobox]]:max-w-full md:[&_button]:min-h-8 md:[&_input]:min-h-8 md:[&_a]:min-h-0 md:[&_[role=combobox]]:min-h-8 [@media(pointer:coarse)]:[&_button]:min-h-11 [@media(pointer:coarse)]:[&_input]:min-h-11 [@media(pointer:coarse)]:[&_a]:min-h-11 [@media(pointer:coarse)]:[&_[role=combobox]]:min-h-11`}
        onClick={handleRecordClick}
      >
        {data.map((value, index) => (
          <ResponsiveCell key={columns[index].key} columnKey={columns[index].key}>
            {index === 0 ? (
              onRowClick ? (
                <button
                  type='button'
                  aria-label={`Abrir ${itemLabel}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRowClick();
                  }}
                  className='inline-flex min-w-11 max-w-full break-all items-center rounded-sm text-left underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-w-0'
                >
                  {value}
                </button>
              ) : (
                <Link
                  to={destinationRoute}
                  state={{ id }}
                  aria-label={`Abrir ${itemLabel}`}
                  className='inline-flex min-w-11 max-w-full break-all items-center rounded-sm underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-w-0'
                >
                  {value}
                </Link>
              )
            ) : (
              value
            )}
          </ResponsiveCell>
        ))}
      </ResponsiveRecord>
  );
}

export default TableItemWithActions;
